# testar-fluxo-evento-final.ps1
# Teste final automatico do fluxo:
# criar evento -> validar capacidades -> editar com pedido existente -> verificar duplicacao -> testar bloqueios.
#
# Rode na raiz do projeto:
# cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos"
# .\testar-fluxo-evento-final.ps1
#
# Parametros opcionais:
# .\testar-fluxo-evento-final.ps1 -ApiBaseUrl "http://localhost:3001/v1"
# .\testar-fluxo-evento-final.ps1 -KeepTestData

param(
  [string]$ApiBaseUrl = "http://localhost:3001/v1",
  [switch]$KeepTestData
)

$ErrorActionPreference = "Stop"

$Root = Get-Location
$ApiDir = Join-Path $Root "apps\api"
$TmpScript = Join-Path $ApiDir ".tmp-testar-fluxo-evento-final.js"

if (-not (Test-Path $ApiDir)) {
  throw "Nao encontrei apps\api. Rode este script na raiz do projeto plataforma-ingressos."
}

$NodeScript = @'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const apiBaseUrl = process.env.TEST_API_BASE_URL || "http://localhost:3001/v1";
const keepTestData = process.env.TEST_KEEP_DATA === "1";

const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const testName = `E2E Fluxo Evento ${stamp}`;
const createdEventIds = [];

function log(title) {
  console.log("");
  console.log("============================================================");
  console.log(title);
  console.log("============================================================");
}

function ok(message) {
  console.log(`OK: ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
  ok(message);
}

function isoDaysFromNow(days, hour = 20, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function money(value) {
  return Number(value).toFixed(2);
}

function int(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function lotLabel(index) {
  return `${index + 1}º Lote`;
}

function distribute(total, chunks) {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeChunks = Math.max(1, Math.floor(chunks));
  const base = Math.floor(safeTotal / safeChunks);
  const remainder = safeTotal % safeChunks;

  return Array.from({ length: safeChunks }, (_, index) => base + (index < remainder ? 1 : 0));
}

function saleWindow(sessionStartsAt, lotIndex, lotCount) {
  const now = new Date();
  const eventStart = new Date(sessionStartsAt);
  const latestEnd = new Date(eventStart.getTime() - 60 * 60 * 1000);
  const availableMs = Math.max(60 * 60 * 1000, latestEnd.getTime() - now.getTime());
  const stepMs = Math.max(60 * 60 * 1000, Math.floor(availableMs / lotCount));
  const start = new Date(now.getTime() + stepMs * lotIndex);
  const end = new Date(Math.min(latestEnd.getTime(), now.getTime() + stepMs * (lotIndex + 1) - 1000));

  return {
    salesStartAt: start.toISOString(),
    salesEndAt: end.toISOString(),
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeTicketTypeForApi(ticket, index = 0) {
  const {
    localId,
    ticketKind,
    ...allowed
  } = ticket;

  return {
    ...allowed,
    quantity: Number.parseInt(String(ticket.quantity ?? "0"), 10),
    minPerOrder: ticket.minPerOrder === undefined ? undefined : Number.parseInt(String(ticket.minPerOrder), 10),
    maxPerOrder: ticket.maxPerOrder === undefined ? undefined : Number.parseInt(String(ticket.maxPerOrder), 10),
    displayOrder: ticket.displayOrder ?? index,
  };
}

function sanitizePayloadForApi(payload) {
  const next = clone(payload);

  next.capacity = Number.parseInt(String(next.capacity ?? "0"), 10);

  if (Array.isArray(next.sessions)) {
    next.sessions = next.sessions.map((session, index) => ({
      ...session,
      capacity: session.capacity === undefined ? undefined : Number.parseInt(String(session.capacity), 10),
      displayOrder: session.displayOrder ?? index,
    }));
  }

  if (Array.isArray(next.sectors)) {
    next.sectors = next.sectors.map((sector, index) => ({
      ...sector,
      capacity: sector.capacity === undefined ? undefined : Number.parseInt(String(sector.capacity), 10),
      displayOrder: sector.displayOrder ?? index,
    }));
  }

  if (Array.isArray(next.ticketTypes)) {
    next.ticketTypes = next.ticketTypes.map((ticket, index) =>
      sanitizeTicketTypeForApi(ticket, index),
    );
  }

  return next;
}

async function api(path, method = "GET", body, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (options.expectFailure) {
    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        data,
      };
    }

    return {
      ok: false,
      status: response.status,
      data,
    };
  }

  if (!response.ok) {
    console.error("Resposta da API:", data);
    fail(`${method} ${path} falhou com status ${response.status}`);
  }

  return data;
}

async function ensureOrganizer() {
  const organizer = await prisma.organizer.upsert({
    where: {
      document: "E2E-TESTE-FLUXO-EVENTO",
    },
    update: {
      tradeName: "Organizador Teste E2E",
      status: "ACTIVE",
    },
    create: {
      tradeName: "Organizador Teste E2E",
      legalName: "Organizador Teste E2E LTDA",
      document: "E2E-TESTE-FLUXO-EVENTO",
      email: "e2e.organizador@example.com",
      phone: "11999999999",
      status: "ACTIVE",
    },
  });

  return organizer;
}

function buildTickets({ sessions, sectors, kinds = ["INTEIRA", "MEIA"], lotsPerKind = 4 }) {
  const tickets = [];
  const labels = {
    INTEIRA: "Inteira",
    MEIA: "Meia",
    SOCIAL: "Social",
  };
  const pricing = {
    INTEIRA: { first: 100, step: 20 },
    MEIA: { first: 50, step: 10 },
    SOCIAL: { first: 40, step: 8 },
  };

  for (const session of sessions) {
    for (const sector of sectors) {
      const sectorCapacity = int(sector.capacity);
      const totalChunks = kinds.length * lotsPerKind;
      const quantities = distribute(sectorCapacity, totalChunks);
      let quantityIndex = 0;

      for (const kind of kinds) {
        for (let lot = 0; lot < lotsPerKind; lot += 1) {
          const quantity = quantities[quantityIndex] || 0;
          quantityIndex += 1;

          if (quantity <= 0) continue;

          const sale = saleWindow(session.startsAt, lot, lotsPerKind);
          const price = pricing[kind].first + pricing[kind].step * lot;

          tickets.push({
            localId: `ticket-${session.localId}-${sector.localId}-${kind}-${lot + 1}`,
            eventSessionLocalId: session.localId,
            venueSectorLocalId: sector.localId,
            occupancyMode: sector.occupancyMode,
            ticketKind: kind,
            name: `${labels[kind]} - ${sector.name}`,
            lotLabel: lotLabel(lot),
            description: "",
            price: money(price),
            quantity: String(quantity),
            salesStartAt: sale.salesStartAt,
            salesEndAt: sale.salesEndAt,
            minPerOrder: 1,
            maxPerOrder: 4,
            displayOrder: tickets.length,
            isHidden: false,
            status: "ACTIVE",
          });
        }
      }
    }
  }

  return tickets;
}

function buildPayload(organizerId) {
  const sessions = [
    {
      localId: "session-1",
      name: "Data 1",
      description: "Teste automatico - data 1",
      startsAt: isoDaysFromNow(45, 20),
      endsAt: isoDaysFromNow(46, 2),
      capacity: 400,
      status: "ACTIVE",
      displayOrder: 0,
    },
    {
      localId: "session-2",
      name: "Data 2",
      description: "Teste automatico - data 2",
      startsAt: isoDaysFromNow(46, 20),
      endsAt: isoDaysFromNow(47, 2),
      capacity: 400,
      status: "ACTIVE",
      displayOrder: 1,
    },
    {
      localId: "session-3",
      name: "Data 3",
      description: "Teste automatico - data 3",
      startsAt: isoDaysFromNow(47, 20),
      endsAt: isoDaysFromNow(48, 2),
      capacity: 400,
      status: "ACTIVE",
      displayOrder: 2,
    },
  ];

  const sectors = [
    {
      localId: "sector-diamante",
      name: "Mesas Diamante",
      description: "Setor teste Mesas Diamante",
      type: "TABLES",
      occupancyMode: "RESERVED_TABLE",
      capacity: 100,
      displayOrder: 0,
      color: "#2563eb",
      gateName: "Portao A",
    },
    {
      localId: "sector-ouro",
      name: "Mesas Ouro",
      description: "Setor teste Mesas Ouro",
      type: "TABLES",
      occupancyMode: "RESERVED_TABLE",
      capacity: 100,
      displayOrder: 1,
      color: "#0284c7",
      gateName: "Portao B",
    },
    {
      localId: "sector-prata",
      name: "Mesas Prata",
      description: "Setor teste Mesas Prata",
      type: "TABLES",
      occupancyMode: "RESERVED_TABLE",
      capacity: 100,
      displayOrder: 2,
      color: "#0891b2",
      gateName: "Portao C",
    },
    {
      localId: "sector-pista",
      name: "Pista",
      description: "Setor teste Pista",
      type: "PLATEIA",
      occupancyMode: "GENERAL_ADMISSION",
      capacity: 100,
      displayOrder: 3,
      color: "#16a34a",
      gateName: "Portao D",
    },
  ];

  return {
    organizerId,
    name: testName,
    description: "Evento criado automaticamente para testar capacidade, datas, setores e lotes.",
    shortDescription: "Teste automatico de fluxo final",
    category: "FESTAS_SHOWS",
    status: "DRAFT",
    visibility: "PUBLIC",
    timezone: "America/Sao_Paulo",
    eventDate: sessions[0].startsAt,
    startDate: sessions[0].startsAt,
    endDate: sessions[sessions.length - 1].endsAt,
    saleStartAt: new Date().toISOString(),
    saleEndAt: sessions[sessions.length - 1].startsAt,
    featured: false,
    capacity: 1200,
    occupancyMode: "MIXED",
    multiSession: true,
    allowSeatMap: false,
    allowTableMap: true,
    checkoutTitle: "Teste checkout",
    checkoutSubtitle: "Nao usar em producao",
    content: {
      headline: "Teste automatico de evento",
      summary: "Teste de fluxo final.",
      fullDescription: "Evento criado por teste automatico para validar capacidade.",
      attractions: "Teste",
      schedule: "Teste",
      sectorDetails: "Teste",
      importantInfo: "Evento de teste.",
      faq: "Teste",
      producerDescription: "Teste",
      purchaseInstructions: "Teste",
    },
    location: {
      mode: "PRESENTIAL",
      venueName: "Local Teste E2E",
      addressLine1: "Rua Teste, 123",
      addressLine2: "",
      neighborhood: "Centro",
      city: "Sao Paulo",
      state: "SP",
      zipCode: "01001000",
      reference: "Teste automatico",
      mapUrl: "https://maps.google.com",
      instructions: "Teste automatico",
    },
    media: {
      coverImageUrl: undefined,
      bannerImageUrl: undefined,
      thumbnailUrl: undefined,
      mobileBannerUrl: undefined,
      sectorMapImageUrl: undefined,
      gallery: [],
    },
    policy: {
      ageRating: "Livre",
      refundPolicy: "Teste",
      halfEntryPolicy: "Teste",
      transferPolicy: "Teste",
      termsNotes: "Teste",
      entryRules: "Teste",
      documentRules: "Teste",
    },
    sessions,
    sectors,
    venueLayouts: [],
    ticketTypes: buildTickets({ sessions, sectors, kinds: ["INTEIRA", "MEIA"], lotsPerKind: 4 }),
  };
}

function summarizeEvent(event) {
  return {
    id: event.id,
    name: event.name,
    capacity: event.capacity,
    sessions: event.sessions?.length || 0,
    sectors: event.sectors?.length || 0,
    ticketTypes: event.ticketTypes?.length || 0,
  };
}

function validateCapacity(event, expected) {
  assert(event.capacity === expected.eventCapacity, `capacidade geral deve ser ${expected.eventCapacity}`);
  assert((event.sessions || []).length === expected.sessions, `deve ter ${expected.sessions} datas`);
  assert((event.sectors || []).length === expected.sectors, `deve ter ${expected.sectors} setores`);
  assert((event.ticketTypes || []).length === expected.ticketTypes, `deve ter ${expected.ticketTypes} ingressos/lotes`);

  const sessionCapacityById = new Map((event.sessions || []).map((session) => [session.id, int(session.capacity) || int(event.capacity)]));
  const sectorCapacityById = new Map((event.sectors || []).map((sector) => [sector.id, int(sector.capacity) || int(event.capacity)]));
  const sessionUsed = new Map();
  const groupUsed = new Map();

  for (const ticketType of event.ticketTypes || []) {
    const quantity = int(ticketType.quantity);
    const sessionId = ticketType.eventSessionId;
    const sectorId = ticketType.venueSectorId;

    assert(quantity > 0, `lote ${ticketType.name} / ${ticketType.lotLabel} deve ter quantidade maior que zero`);
    assert(Boolean(sessionId), `lote ${ticketType.name} / ${ticketType.lotLabel} deve estar ligado a uma data`);
    assert(Boolean(sectorId), `lote ${ticketType.name} / ${ticketType.lotLabel} deve estar ligado a um setor`);

    sessionUsed.set(sessionId, (sessionUsed.get(sessionId) || 0) + quantity);
    const groupKey = `${sessionId}::${sectorId}`;
    groupUsed.set(groupKey, (groupUsed.get(groupKey) || 0) + quantity);
  }

  for (const session of event.sessions || []) {
    const used = sessionUsed.get(session.id) || 0;
    const limit = sessionCapacityById.get(session.id) || int(event.capacity);

    assert(used <= limit, `data ${session.name} nao pode passar da capacidade (${used}/${limit})`);
  }

  for (const session of event.sessions || []) {
    for (const sector of event.sectors || []) {
      const groupKey = `${session.id}::${sector.id}`;
      const used = groupUsed.get(groupKey) || 0;
      const sessionLimit = sessionCapacityById.get(session.id) || int(event.capacity);
      const sectorLimit = sectorCapacityById.get(sector.id) || int(event.capacity);
      const limit = Math.min(sessionLimit, sectorLimit);

      assert(used <= limit, `setor ${sector.name} na data ${session.name} nao pode passar do limite (${used}/${limit})`);
    }
  }
}

async function cleanup() {
  if (keepTestData || createdEventIds.length === 0) {
    if (keepTestData) {
      console.log("KeepTestData ativo. Dados de teste mantidos.");
    }
    return;
  }

  log("Limpando dados de teste");

  for (const eventId of createdEventIds.reverse()) {
    try {
      await prisma.payment.deleteMany({
        where: {
          order: {
            eventId,
          },
        },
      });
      await prisma.ticket.deleteMany({
        where: {
          orderItem: {
            order: {
              eventId,
            },
          },
        },
      });
      await prisma.orderItem.deleteMany({
        where: {
          order: {
            eventId,
          },
        },
      });
      await prisma.order.deleteMany({ where: { eventId } });
      await prisma.seatHold.deleteMany({ where: { eventId } });
      await prisma.ticketType.deleteMany({ where: { eventId } });
      await prisma.venueLayout.deleteMany({ where: { eventId } });
      await prisma.eventSession.deleteMany({ where: { eventId } });
      await prisma.venueSector.deleteMany({ where: { eventId } });
      await prisma.eventContent.deleteMany({ where: { eventId } });
      await prisma.eventLocation.deleteMany({ where: { eventId } });
      await prisma.eventMedia.deleteMany({ where: { eventId } });
      await prisma.eventPolicy.deleteMany({ where: { eventId } });
      await prisma.supportThread.deleteMany({ where: { eventId } });
      await prisma.event.deleteMany({ where: { id: eventId } });
      ok(`evento de teste removido: ${eventId}`);
    } catch (error) {
      console.warn(`Nao consegui limpar o evento ${eventId}:`, error.message);
    }
  }
}

async function main() {
  log("1. Verificando API");
  await api("/events");
  ok(`API respondeu em ${apiBaseUrl}`);

  log("2. Preparando organizador de teste");
  const organizer = await ensureOrganizer();
  ok(`organizador pronto: ${organizer.id}`);

  const payload = buildPayload(organizer.id);
  const expected = {
    eventCapacity: 1200,
    sessions: 3,
    sectors: 4,
    ticketTypes: 3 * 4 * 2 * 4,
  };

  log("3. Testando bloqueio na CRIACAO com excesso");
  const badCreatePayload = clone(payload);
  badCreatePayload.name = `${testName} - DEVE FALHAR`;
  badCreatePayload.ticketTypes = [
    {
      ...payload.ticketTypes[0],
      localId: "bad-ticket-create",
      quantity: "99999",
    },
  ];

  const badCreate = await api("/events", "POST", sanitizePayloadForApi(badCreatePayload), { expectFailure: true });

  if (badCreate.ok) {
    createdEventIds.push(badCreate.data.id);
    fail("ERRO GRAVE: a API aceitou criar evento com ingressos acima da capacidade.");
  }

  assert(badCreate.status >= 400, `criacao com excesso deve falhar, status recebido ${badCreate.status}`);

  log("4. Criando evento valido");
  const created = await api("/events", "POST", sanitizePayloadForApi(payload));
  createdEventIds.push(created.id);
  console.log("Evento criado:", summarizeEvent(created));
  validateCapacity(created, expected);

  log("5. Criando pedido ficticio para testar edicao sem duplicar");
  await prisma.order.create({
    data: {
      eventId: created.id,
      customerName: "Cliente Teste E2E",
      customerEmail: `cliente-${stamp}@example.com`,
      customerCpf: "00000000000",
      status: "PENDING",
      totalAmount: "0.00",
    },
  });
  ok("pedido ficticio criado. Agora a edicao deve preservar estrutura sem duplicar.");

  log("6. Editando evento valido com pedido existente");
  const updatePayload = clone(payload);
  updatePayload.name = `${testName} - EDITADO 1`;
  updatePayload.description = "Evento editado pelo teste automatico.";

  const edited1 = await api(`/events/${created.id}/full`, "PATCH", sanitizePayloadForApi(updatePayload));
  console.log("Depois da edicao 1:", summarizeEvent(edited1));
  validateCapacity(edited1, expected);

  log("7. Editando novamente para confirmar que nao duplica");
  updatePayload.name = `${testName} - EDITADO 2`;
  const edited2 = await api(`/events/${created.id}/full`, "PATCH", sanitizePayloadForApi(updatePayload));
  console.log("Depois da edicao 2:", summarizeEvent(edited2));
  validateCapacity(edited2, expected);

  log("8. Testando bloqueio na EDICAO com excesso");
  const badUpdatePayload = clone(payload);
  badUpdatePayload.name = `${testName} - EDICAO DEVE FALHAR`;
  badUpdatePayload.ticketTypes = [
    {
      ...payload.ticketTypes[0],
      localId: "bad-ticket-update",
      quantity: "99999",
    },
  ];

  const badUpdate = await api(`/events/${created.id}/full`, "PATCH", sanitizePayloadForApi(badUpdatePayload), { expectFailure: true });

  if (badUpdate.ok) {
    fail("ERRO GRAVE: a API aceitou editar evento com ingressos acima da capacidade.");
  }

  assert(badUpdate.status >= 400, `edicao com excesso deve falhar, status recebido ${badUpdate.status}`);

  log("9. Conferindo estado final do evento");
  const finalEvent = await api(`/events/${created.id}`);
  console.log("Estado final:", summarizeEvent(finalEvent));
  validateCapacity(finalEvent, expected);

  log("RESULTADO FINAL");
  console.log("✅ Fluxo aprovado: criacao, edicao, anti-duplicacao e trava de capacidade passaram.");
}

main()
  .catch((error) => {
    console.error("");
    console.error("❌ TESTE FALHOU");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
'@

Set-Content -Path $TmpScript -Value $NodeScript -Encoding UTF8

try {
  Push-Location $ApiDir

  $env:TEST_API_BASE_URL = $ApiBaseUrl
  $env:TEST_KEEP_DATA = if ($KeepTestData) { "1" } else { "0" }

  Write-Host "Rodando teste final do fluxo de evento..." -ForegroundColor Cyan
  Write-Host "API: $ApiBaseUrl" -ForegroundColor Cyan

  node ".tmp-testar-fluxo-evento-final.js"

  if ($LASTEXITCODE -ne 0) {
    throw "Teste falhou. Veja a mensagem acima."
  }

  Write-Host ""
  Write-Host "Teste final concluido com sucesso." -ForegroundColor Green
}
finally {
  Pop-Location
}

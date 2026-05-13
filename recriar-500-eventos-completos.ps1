# recriar-500-eventos-completos.ps1
# Apaga TODOS os eventos existentes e recria 500 eventos completos de teste.
#
# Rode na raiz do projeto:
# cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos"
# .\recriar-500-eventos-completos.ps1 -ConfirmDelete
#
# Para mudar a quantidade:
# .\recriar-500-eventos-completos.ps1 -ConfirmDelete -TotalEvents 500
#
# CUIDADO:
# Este script apaga eventos, pedidos, pagamentos, tickets, check-ins, suportes,
# mapas, setores, datas e lotes vinculados aos eventos.

param(
  [int]$TotalEvents = 500,
  [switch]$ConfirmDelete
)

$ErrorActionPreference = "Stop"

if (-not $ConfirmDelete) {
  Write-Host ""
  Write-Host "BLOQUEADO POR SEGURANCA." -ForegroundColor Red
  Write-Host "Este script apaga TODOS os eventos existentes do banco." -ForegroundColor Yellow
  Write-Host "Para executar de verdade, rode:" -ForegroundColor Yellow
  Write-Host '.\recriar-500-eventos-completos.ps1 -ConfirmDelete' -ForegroundColor Cyan
  Write-Host ""
  exit 1
}

$Root = Get-Location
$ApiDir = Join-Path $Root "apps\api"
$SeedPath = Join-Path $ApiDir ".tmp-recriar-500-eventos-completos.js"

if (-not (Test-Path $ApiDir)) {
  throw "Nao encontrei apps\api. Rode este script na raiz do projeto plataforma-ingressos."
}

$NodeScript = @'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const totalEvents = Number.parseInt(process.env.SEED_TOTAL_EVENTS || "500", 10);

function log(title) {
  console.log("");
  console.log("============================================================");
  console.log(title);
  console.log("============================================================");
}

function datePlusDays(days, hour = 20, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function money(value) {
  return Number(value).toFixed(2);
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function distribute(total, chunks) {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeChunks = Math.max(1, Math.floor(chunks));
  const base = Math.floor(safeTotal / safeChunks);
  const rest = safeTotal % safeChunks;

  return Array.from({ length: safeChunks }, (_, index) => base + (index < rest ? 1 : 0));
}

function eventCategory(index) {
  const categories = [
    "FESTAS_SHOWS",
    "TEATROS_ESPETACULOS",
    "STAND_UP_COMEDY",
    "ESPORTES",
    "PASSEIOS_TOURS",
    "CONGRESSOS",
    "INFANTIL",
    "GASTRONOMIA",
  ];

  return categories[index % categories.length];
}

function categoryLabel(category) {
  const labels = {
    FESTAS_SHOWS: "Festival",
    TEATROS_ESPETACULOS: "Teatro",
    STAND_UP_COMEDY: "Stand-up",
    ESPORTES: "Esporte",
    PASSEIOS_TOURS: "Tour",
    CONGRESSOS: "Congresso",
    INFANTIL: "Infantil",
    GASTRONOMIA: "Gastronomia",
  };

  return labels[category] || "Evento";
}

function occupancyForCategory(category) {
  if (category === "TEATROS_ESPETACULOS") return "RESERVED_SEATING";
  if (category === "GASTRONOMIA") return "RESERVED_TABLE";
  if (category === "CONGRESSOS") return "MIXED";
  return "MIXED";
}

function buildSectorTemplates(category, eventIndex) {
  if (category === "TEATROS_ESPETACULOS") {
    return [
      { name: "Plateia Premium", type: "CHAIRS", occupancyMode: "RESERVED_SEATING", capacity: 160, color: "#2563eb", gateName: "Entrada A" },
      { name: "Plateia Central", type: "CHAIRS", occupancyMode: "RESERVED_SEATING", capacity: 220, color: "#0284c7", gateName: "Entrada B" },
      { name: "Mezanino", type: "CHAIRS", occupancyMode: "RESERVED_SEATING", capacity: 140, color: "#0891b2", gateName: "Entrada C" },
      { name: "Balcao", type: "CHAIRS", occupancyMode: "RESERVED_SEATING", capacity: 80, color: "#0f766e", gateName: "Entrada D" },
    ];
  }

  if (category === "GASTRONOMIA") {
    return [
      { name: "Mesas Diamante", type: "TABLES", occupancyMode: "RESERVED_TABLE", capacity: 120, color: "#f59e0b", gateName: "Portao A" },
      { name: "Mesas Ouro", type: "TABLES", occupancyMode: "RESERVED_TABLE", capacity: 160, color: "#eab308", gateName: "Portao B" },
      { name: "Mesas Prata", type: "TABLES", occupancyMode: "RESERVED_TABLE", capacity: 180, color: "#94a3b8", gateName: "Portao C" },
      { name: "Pista Gourmet", type: "GENERAL", occupancyMode: "GENERAL_ADMISSION", capacity: 240, color: "#16a34a", gateName: "Portao D" },
    ];
  }

  if (category === "CONGRESSOS") {
    return [
      { name: "Auditório Principal", type: "CHAIRS", occupancyMode: "RESERVED_SEATING", capacity: 260, color: "#2563eb", gateName: "Credenciamento A" },
      { name: "Área VIP", type: "CHAIRS", occupancyMode: "RESERVED_SEATING", capacity: 100, color: "#7c3aed", gateName: "Credenciamento VIP" },
      { name: "Workshop 1", type: "ROOM", occupancyMode: "GENERAL_ADMISSION", capacity: 120, color: "#0891b2", gateName: "Sala 1" },
      { name: "Workshop 2", type: "ROOM", occupancyMode: "GENERAL_ADMISSION", capacity: 120, color: "#0f766e", gateName: "Sala 2" },
    ];
  }

  const addCamarote = eventIndex % 3 !== 0;

  const sectors = [
    { name: "Pista", type: "GENERAL", occupancyMode: "GENERAL_ADMISSION", capacity: 420, color: "#16a34a", gateName: "Portao Pista" },
    { name: "Front Stage", type: "GENERAL", occupancyMode: "GENERAL_ADMISSION", capacity: 180, color: "#2563eb", gateName: "Portao Front" },
    { name: "Mesas Diamante", type: "TABLES", occupancyMode: "RESERVED_TABLE", capacity: 100, color: "#f59e0b", gateName: "Portao Diamante" },
    { name: "Mesas Ouro", type: "TABLES", occupancyMode: "RESERVED_TABLE", capacity: 120, color: "#eab308", gateName: "Portao Ouro" },
  ];

  if (addCamarote) {
    sectors.push({ name: "Camarote Premium", type: "BOOTH", occupancyMode: "MIXED", capacity: 180, color: "#7c3aed", gateName: "Portao Camarote" });
  }

  return sectors;
}

function buildSessions(eventIndex, eventDate, endDate, eventCapacity) {
  const sessionCount = eventIndex % 5 === 0 ? 3 : eventIndex % 2 === 0 ? 2 : 1;
  const capacities = distribute(eventCapacity, sessionCount);

  return Array.from({ length: sessionCount }, (_, index) => {
    const startsAt = new Date(eventDate);
    startsAt.setDate(startsAt.getDate() + index);
    const endsAt = new Date(startsAt);
    endsAt.setHours(endsAt.getHours() + 6);

    return {
      localId: `session-${index + 1}`,
      name: startsAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }),
      description: `Data ${index + 1} do evento.`,
      startsAt,
      endsAt: endsAt > endDate ? endDate : endsAt,
      capacity: capacities[index],
      status: "ACTIVE",
      displayOrder: index,
    };
  });
}

function buildTickets({ sessions, sectors, eventDate, category }) {
  const tickets = [];
  const kinds = category === "INFANTIL" ? ["INTEIRA", "MEIA", "SOCIAL"] : ["INTEIRA", "MEIA"];
  const lotCountBase = category === "CONGRESSOS" ? 3 : 4;

  for (const session of sessions) {
    for (const sector of sectors) {
      const sectorCapacity = Number(sector.capacity || 0);
      const lotCount = sectorCapacity >= 300 ? lotCountBase + 1 : lotCountBase;
      const totalChunks = kinds.length * lotCount;
      const quantities = distribute(sectorCapacity, totalChunks);
      let quantityCursor = 0;

      for (const kind of kinds) {
        const priceBase = kind === "INTEIRA" ? 80 : kind === "MEIA" ? 40 : 35;
        const sectorBonus = sector.name.includes("VIP") || sector.name.includes("Diamante") || sector.name.includes("Front") ? 70 : 0;
        const priceStep = kind === "INTEIRA" ? 20 : 10;

        for (let lotIndex = 0; lotIndex < lotCount; lotIndex += 1) {
          const quantity = quantities[quantityCursor] || 0;
          quantityCursor += 1;

          if (quantity <= 0) continue;

          const salesStartAt = new Date();
          salesStartAt.setDate(salesStartAt.getDate() + Math.max(0, lotIndex * 4));
          const salesEndAt = new Date(session.startsAt);
          salesEndAt.setDate(salesEndAt.getDate() - Math.max(1, lotCount - lotIndex));

          if (salesEndAt < salesStartAt) {
            salesEndAt.setTime(session.startsAt.getTime() - 60 * 60 * 1000);
          }

          const label = kind === "INTEIRA" ? "Inteira" : kind === "MEIA" ? "Meia" : "Social";

          tickets.push({
            eventSessionLocalId: session.localId,
            venueSectorLocalId: sector.localId,
            occupancyMode: sector.occupancyMode,
            name: `${label} - ${sector.name}`,
            lotLabel: `${lotIndex + 1}º Lote`,
            description: `${label} para ${sector.name}.`,
            price: money(priceBase + sectorBonus + priceStep * lotIndex),
            quantity,
            salesStartAt,
            salesEndAt,
            minPerOrder: 1,
            maxPerOrder: sector.occupancyMode === "RESERVED_TABLE" ? 8 : 4,
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

function buildMapObjects(sectors) {
  const objects = [
    {
      code: "PALCO",
      label: "Palco",
      type: "STAGE",
      capacity: 1,
      x: 420,
      y: 60,
      width: 440,
      height: 100,
      rotation: 0,
      status: "AVAILABLE",
      metadata: { role: "STAGE", shape: "RECT", generatedBy: "seed" },
    },
    {
      code: "CORREDOR-CENTRAL",
      label: "Corredor central",
      type: "AISLE",
      capacity: 1,
      x: 580,
      y: 180,
      width: 120,
      height: 560,
      rotation: 0,
      status: "AVAILABLE",
      metadata: { role: "AISLE", shape: "RECT", generatedBy: "seed" },
    },
    {
      code: "ENTRADA",
      label: "Entrada Principal",
      type: "AREA",
      capacity: 1,
      x: 500,
      y: 770,
      width: 280,
      height: 70,
      rotation: 0,
      status: "AVAILABLE",
      metadata: { role: "OPERATIONAL", operationalType: "ENTRANCE", shape: "RECT", generatedBy: "seed" },
    },
    {
      code: "BAR",
      label: "Bar",
      type: "AREA",
      capacity: 1,
      x: 1020,
      y: 690,
      width: 180,
      height: 70,
      rotation: 0,
      status: "AVAILABLE",
      metadata: { role: "OPERATIONAL", operationalType: "BAR", shape: "RECT", generatedBy: "seed" },
    },
    {
      code: "WC",
      label: "Banheiros",
      type: "AREA",
      capacity: 1,
      x: 80,
      y: 690,
      width: 180,
      height: 70,
      rotation: 0,
      status: "AVAILABLE",
      metadata: { role: "OPERATIONAL", operationalType: "RESTROOM", shape: "RECT", generatedBy: "seed" },
    },
  ];

  const positions = [
    [250, 220, 280, 120],
    [750, 220, 280, 120],
    [250, 390, 280, 120],
    [750, 390, 280, 120],
    [410, 560, 460, 120],
  ];

  for (const [index, sector] of sectors.entries()) {
    const [x, y, width, height] = positions[index % positions.length];

    objects.push({
      venueSectorLocalId: sector.localId,
      code: `SETOR-${index + 1}`,
      label: sector.name,
      type: sector.type === "BOOTH" ? "BOOTH" : sector.type === "TABLES" ? "TABLE" : "AREA",
      capacity: sector.capacity,
      x,
      y,
      width,
      height,
      rotation: index % 2 === 0 ? -3 : 3,
      status: "AVAILABLE",
      metadata: {
        role: "SECTOR",
        shape: "POLYGON",
        generatedBy: "seed",
        points: [
          { x, y },
          { x: x + width, y: y + 10 },
          { x: x + width - 15, y: y + height },
          { x: x + 15, y: y + height - 10 },
        ],
      },
    });
  }

  return objects;
}

async function clearEvents() {
  log("Apagando eventos existentes e dependencias");

  await prisma.checkin.deleteMany({});
  await prisma.ticketTransferRequest.deleteMany({});
  await prisma.ticketCancellation.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.supportMessage.deleteMany({});
  await prisma.supportThread.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.seatHold.deleteMany({});
  await prisma.seatMapObject.deleteMany({});
  await prisma.venueLayout.deleteMany({});
  await prisma.ticketType.deleteMany({});
  await prisma.eventSession.deleteMany({});
  await prisma.venueSector.deleteMany({});
  await prisma.eventContent.deleteMany({});
  await prisma.eventLocation.deleteMany({});
  await prisma.eventMedia.deleteMany({});
  await prisma.eventPolicy.deleteMany({});
  await prisma.event.deleteMany({});

  console.log("Eventos e dependencias apagados.");
}

async function ensureOrganizers() {
  log("Criando organizadores de teste");

  const organizers = [];

  for (let i = 1; i <= 10; i += 1) {
    const organizer = await prisma.organizer.upsert({
      where: { document: `SEED-ORG-${String(i).padStart(2, "0")}` },
      update: {
        tradeName: `Produtora Seed ${i}`,
        status: "ACTIVE",
      },
      create: {
        tradeName: `Produtora Seed ${i}`,
        legalName: `Produtora Seed ${i} LTDA`,
        document: `SEED-ORG-${String(i).padStart(2, "0")}`,
        email: `produtora${i}@example.com`,
        phone: `1199999${String(i).padStart(4, "0")}`,
        status: "ACTIVE",
        slug: `produtora-seed-${i}`,
        bio: "Organizador criado automaticamente para teste.",
        city: "Sao Paulo",
        state: "SP",
      },
    });

    organizers.push(organizer);
  }

  return organizers;
}

async function createOneEvent(index, organizer) {
  const category = eventCategory(index);
  const categoryName = categoryLabel(category);
  const eventNumber = index + 1;
  const eventDate = datePlusDays(15 + index, 20, 0);
  const endDate = new Date(eventDate);
  endDate.setDate(endDate.getDate() + (index % 5 === 0 ? 2 : index % 2 === 0 ? 1 : 0));
  endDate.setHours(23, 59, 0, 0);

  const sectorTemplates = buildSectorTemplates(category, index);
  const baseCapacity = sectorTemplates.reduce((sum, sector) => sum + sector.capacity, 0);
  const sessionCount = index % 5 === 0 ? 3 : index % 2 === 0 ? 2 : 1;
  const eventCapacity = baseCapacity * sessionCount;
  const sessions = buildSessions(index, eventDate, endDate, eventCapacity);
  const sectors = sectorTemplates.map((sector, sectorIndex) => ({
    ...sector,
    localId: `sector-${sectorIndex + 1}`,
    displayOrder: sectorIndex,
  }));
  const tickets = buildTickets({ sessions, sectors, eventDate, category });
  const eventName = `${categoryName} Seed ${String(eventNumber).padStart(3, "0")}`;
  const slug = `${slugify(eventName)}-${Date.now()}-${eventNumber}`;

  const event = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      name: eventName,
      slug,
      description: `Evento completo de teste ${eventNumber}, categoria ${categoryName}.`,
      shortDescription: `Evento seed ${eventNumber}.`,
      category,
      status: index % 4 === 0 ? "PUBLISHED" : "DRAFT",
      visibility: "PUBLIC",
      timezone: "America/Sao_Paulo",
      eventDate,
      startDate: eventDate,
      endDate,
      saleStartAt: new Date(),
      saleEndAt: eventDate,
      featured: index % 10 === 0,
      highlightTag: index % 10 === 0 ? "Destaque" : null,
      checkoutTitle: `Ingressos para ${eventName}`,
      checkoutSubtitle: "Compra segura pela plataforma.",
      capacity: eventCapacity,
      occupancyMode: occupancyForCategory(category),
      multiSession: sessions.length > 1,
      allowSeatMap: category === "TEATROS_ESPETACULOS" || category === "CONGRESSOS",
      allowTableMap: category === "GASTRONOMIA" || category === "FESTAS_SHOWS",
      content: {
        create: {
          headline: `${eventName}: uma experiência completa`,
          summary: `Resumo do ${eventName}.`,
          fullDescription: `Descrição completa do ${eventName}. Evento criado por seed para testar listagem, edição, checkout, setores, lotes e mapas.`,
          attractions: "Atração principal, convidados especiais e programação completa.",
          schedule: "Abertura dos portões, início do evento, intervalos e encerramento.",
          sectorDetails: "Setores com capacidades controladas por data e por lote.",
          importantInfo: "Chegue com antecedência e apresente documento com foto.",
          faq: "Perguntas frequentes do evento de teste.",
          producerDescription: `${organizer.tradeName} apresenta este evento teste.`,
          purchaseInstructions: "Escolha o setor, selecione o ingresso e conclua o pagamento.",
        },
      },
      location: {
        create: {
          mode: "PRESENTIAL",
          venueName: `Espaço Seed ${((index % 12) + 1)}`,
          addressLine1: `Rua dos Eventos, ${100 + index}`,
          addressLine2: index % 2 === 0 ? "Portao principal" : null,
          neighborhood: "Centro",
          city: ["Sao Paulo", "Campinas", "Ribeirao Preto", "Belo Horizonte", "Curitiba"][index % 5],
          state: ["SP", "SP", "SP", "MG", "PR"][index % 5],
          zipCode: "01001000",
          reference: "Próximo ao ponto de referência principal.",
          mapUrl: "https://maps.google.com",
          instructions: "Entrada pelo acesso principal.",
        },
      },
      media: {
        create: {
          coverImageUrl: `https://picsum.photos/seed/event-cover-${eventNumber}/1200/600`,
          bannerImageUrl: `https://picsum.photos/seed/event-banner-${eventNumber}/1600/500`,
          thumbnailUrl: `https://picsum.photos/seed/event-thumb-${eventNumber}/400/300`,
          mobileBannerUrl: `https://picsum.photos/seed/event-mobile-${eventNumber}/800/1000`,
          sectorMapImageUrl: `https://picsum.photos/seed/event-map-${eventNumber}/1200/900`,
          gallery: [
            `https://picsum.photos/seed/event-${eventNumber}-1/900/600`,
            `https://picsum.photos/seed/event-${eventNumber}-2/900/600`,
            `https://picsum.photos/seed/event-${eventNumber}-3/900/600`,
          ],
        },
      },
      policy: {
        create: {
          ageRating: category === "INFANTIL" ? "Livre" : "16 anos",
          refundPolicy: "Reembolso conforme política do evento.",
          halfEntryPolicy: "Meia-entrada mediante documento comprobatório.",
          transferPolicy: "Transferência permitida conforme regras do evento.",
          termsNotes: "Ao comprar, o cliente aceita os termos do evento.",
          entryRules: "Entrada mediante ingresso válido e documento oficial.",
          documentRules: "Pode ser solicitado documento na entrada.",
        },
      },
    },
  });

  const sessionIdByLocalId = new Map();
  const sectorIdByLocalId = new Map();

  for (const session of sessions) {
    const created = await prisma.eventSession.create({
      data: {
        eventId: event.id,
        name: session.name,
        description: session.description,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        capacity: session.capacity,
        status: session.status,
        displayOrder: session.displayOrder,
      },
    });

    sessionIdByLocalId.set(session.localId, created.id);
  }

  for (const sector of sectors) {
    const created = await prisma.venueSector.create({
      data: {
        eventId: event.id,
        name: sector.name,
        description: `${sector.name} do ${eventName}.`,
        type: sector.type,
        occupancyMode: sector.occupancyMode,
        capacity: sector.capacity,
        displayOrder: sector.displayOrder,
        color: sector.color,
        gateName: sector.gateName,
      },
    });

    sectorIdByLocalId.set(sector.localId, created.id);
  }

  const layout = await prisma.venueLayout.create({
    data: {
      eventId: event.id,
      name: "Mapa principal",
      occupancyMode: occupancyForCategory(category),
      width: 1280,
      height: 900,
      mapData: {
        generatedBy: "seed",
        version: "500-events-seed",
      },
      isDefault: true,
      status: "ACTIVE",
    },
  });

  for (const object of buildMapObjects(sectors)) {
    await prisma.seatMapObject.create({
      data: {
        layoutId: layout.id,
        venueSectorId: object.venueSectorLocalId ? sectorIdByLocalId.get(object.venueSectorLocalId) : undefined,
        code: object.code,
        label: object.label,
        type: object.type,
        capacity: object.capacity,
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height,
        rotation: object.rotation,
        status: object.status,
        metadata: object.metadata,
      },
    });
  }

  await prisma.ticketType.createMany({
    data: tickets.map((ticket) => ({
      eventId: event.id,
      eventSessionId: sessionIdByLocalId.get(ticket.eventSessionLocalId),
      venueSectorId: sectorIdByLocalId.get(ticket.venueSectorLocalId),
      name: ticket.name,
      lotLabel: ticket.lotLabel,
      description: ticket.description,
      price: ticket.price,
      quantity: ticket.quantity,
      salesStartAt: ticket.salesStartAt,
      salesEndAt: ticket.salesEndAt,
      minPerOrder: ticket.minPerOrder,
      maxPerOrder: ticket.maxPerOrder,
      displayOrder: ticket.displayOrder,
      isHidden: ticket.isHidden,
      status: ticket.status,
      occupancyMode: ticket.occupancyMode,
    })),
  });

  return event.id;
}

async function main() {
  const startedAt = Date.now();

  log(`Recriando ${totalEvents} eventos completos`);
  await clearEvents();

  const organizers = await ensureOrganizers();

  log("Criando eventos");

  for (let index = 0; index < totalEvents; index += 1) {
    const organizer = organizers[index % organizers.length];
    await createOneEvent(index, organizer);

    if ((index + 1) % 25 === 0 || index + 1 === totalEvents) {
      console.log(`Criados ${index + 1}/${totalEvents} eventos...`);
    }
  }

  log("Resumo final");

  const [
    events,
    sessions,
    sectors,
    layouts,
    objects,
    ticketTypes,
    organizersCount,
  ] = await Promise.all([
    prisma.event.count(),
    prisma.eventSession.count(),
    prisma.venueSector.count(),
    prisma.venueLayout.count(),
    prisma.seatMapObject.count(),
    prisma.ticketType.count(),
    prisma.organizer.count(),
  ]);

  console.table({
    organizers: organizersCount,
    events,
    sessions,
    sectors,
    layouts,
    mapObjects: objects,
    ticketTypes,
  });

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`Finalizado em ${seconds}s.`);
}

main()
  .catch((error) => {
    console.error("");
    console.error("ERRO AO RECRIAR EVENTOS");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
'@

Set-Content -Path $SeedPath -Value $NodeScript -Encoding UTF8

try {
  Push-Location $ApiDir

  $env:SEED_TOTAL_EVENTS = "$TotalEvents"

  Write-Host ""
  Write-Host "Apagando eventos existentes e criando $TotalEvents eventos completos..." -ForegroundColor Cyan
  Write-Host "Diretorio API: $ApiDir" -ForegroundColor Cyan
  Write-Host ""

  node ".tmp-recriar-500-eventos-completos.js"

  if ($LASTEXITCODE -ne 0) {
    throw "Seed falhou. Veja o erro acima."
  }

  Write-Host ""
  Write-Host "Seed concluido com sucesso." -ForegroundColor Green
}
finally {
  Pop-Location
}

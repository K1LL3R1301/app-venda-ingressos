$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$ScriptsDir = Join-Path $WebRoot "scripts"
$NodeScriptPath = Join-Path $ScriptsDir "support-guided-walkthrough.cjs"
$RunnerPath = Join-Path $ProjectRoot "run-support-guided-walkthrough.ps1"
$ProgressRunnerPath = Join-Path $ProjectRoot "run-support-guided-visual-tests.ps1"

function Write-Utf8NoBom {
  param(
    [string] $Path,
    [string] $LiteralPath,
    [AllowEmptyString()][string] $Content
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    $Path = $LiteralPath
  }

  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Caminho nao informado para Write-Utf8NoBom."
  }

  $Dir = [System.IO.Path]::GetDirectoryName($Path)
  if (![string]::IsNullOrWhiteSpace($Dir) -and ![System.IO.Directory]::Exists($Dir)) {
    [System.IO.Directory]::CreateDirectory($Dir) | Out-Null
  }

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Backup-File {
  param([Parameter(Mandatory = $true)][string] $Path)

  if (Test-Path -LiteralPath $Path) {
    $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $BackupPath = "$Path.bak-support-walkthrough-$Stamp"
    Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
    Write-Host "[OK] Backup criado: $BackupPath"
  }
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Criando walkthrough visual sem Playwright Test Runner"

New-Item -ItemType Directory -Force -Path $ScriptsDir | Out-Null
Backup-File $NodeScriptPath
Backup-File $RunnerPath
Backup-File $ProgressRunnerPath

$NodeScript = @'
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const WEB_ROOT = process.cwd();
const OUT_DIR = path.join(WEB_ROOT, "test-results", "support-guided-walkthrough");
const REPORT_DIR = path.join(WEB_ROOT, "test-results", "reports");
const REPORT_PATH = path.join(REPORT_DIR, `support-guided-walkthrough-${stamp()}.txt`);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

const EVENT = {
  id: "evt-suporte-visual-001",
  name: "Infantil Seed 487",
  startDate: "2026-06-20T19:00:00.000Z",
  eventDate: "2026-06-20T19:00:00.000Z",
  status: "PUBLISHED",
  location: {
    venueName: "Teatro Seed 002",
    city: "Campinas",
    state: "SP",
  },
};

const ORDER = {
  id: "order-suporte-visual-001",
  status: "PAID",
  totalAmount: 330,
  event: EVENT,
};

const ASSIGNMENT = {
  id: "assign-suporte-visual-001",
  status: "ACCEPTED",
  eventId: EVENT.id,
  eventName: EVENT.name,
  eventTitle: EVENT.name,
  operatorUserId: "operator-visual",
  operatorEmail: "operador@teste.local",
  event: EVENT,
};

const USERS = {
  customer: {
    id: "customer-visual",
    sub: "customer-visual",
    name: "Cliente Visual",
    email: "cliente@teste.local",
    role: "CUSTOMER",
  },
  producer: {
    id: "producer-visual",
    sub: "producer-visual",
    name: "Produtor Visual",
    email: "produtor@teste.local",
    role: "ADMIN",
  },
  operator: {
    id: "operator-visual",
    sub: "operator-visual",
    name: "Operador Visual",
    email: "operador@teste.local",
    role: "OPERATOR",
    cpf: "11122233344",
  },
  superAdmin: {
    id: "super-visual",
    sub: "super-visual",
    name: "Suporte Site",
    email: "super@teste.local",
    role: "SUPER_ADMIN",
  },
};

let tickets = seedTickets();
let issues = [];
let warnings = [];
let stepDone = 0;

const totalSteps = 20;

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function nowIso() {
  return new Date().toISOString();
}

function log(message) {
  console.log(message);
  fs.appendFileSync(REPORT_PATH, `${message}\n`, "utf8");
}

function progress(label) {
  stepDone += 1;
  const percent = Math.min(100, Math.floor((stepDone / totalSteps) * 100));
  const size = 30;
  const filled = Math.floor((percent / 100) * size);
  const bar = "#".repeat(filled) + "-".repeat(size - filled);
  log(`[PROGRESSO] [${bar}] ${String(percent).padStart(3, " ")}%  ${stepDone}/${totalSteps}  ${label}`);
}

function warn(message) {
  warnings.push(message);
  log(`[AVISO] ${message}`);
}

function fail(message) {
  issues.push(message);
  log(`[FALHA] ${message}`);
}

function seedTickets() {
  return [
    {
      id: "sup-visual-customer-open",
      protocol: "ASTRO-SUP-VISUAL-001",
      title: "Dúvida sobre entrada do evento",
      subject: "Dúvida sobre entrada do evento",
      category: "Atendimento",
      status: "OPEN",
      currentOwnerType: "PRODUCER",
      sourceType: "CUSTOMER",
      targetType: "ALL",
      eventId: EVENT.id,
      eventName: EVENT.name,
      event: EVENT,
      customerName: USERS.customer.name,
      customerEmail: USERS.customer.email,
      producerName: USERS.producer.name,
      producerEmail: USERS.producer.email,
      order: ORDER,
      orderId: ORDER.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastMessageAt: nowIso(),
      messages: [
        {
          id: "msg-visual-001",
          text: "Oi, quero confirmar qual portão devo usar.",
          message: "Oi, quero confirmar qual portão devo usar.",
          authorRole: "CUSTOMER",
          senderType: "CUSTOMER",
          senderName: USERS.customer.name,
          targetType: "ALL",
          createdAt: nowIso(),
        },
      ],
    },
    {
      id: "sup-visual-forwarded",
      protocol: "ASTRO-SUP-VISUAL-002",
      title: "Problema técnico no leitor de QR Code",
      subject: "Problema técnico no leitor de QR Code",
      category: "Suporte técnico",
      status: "FORWARDED_TO_SUPER_ADMIN",
      currentOwnerType: "SUPER_ADMIN",
      sourceType: "OPERATOR",
      targetType: "ALL",
      eventId: EVENT.id,
      eventName: EVENT.name,
      event: EVENT,
      customerName: USERS.customer.name,
      customerEmail: USERS.customer.email,
      operatorName: USERS.operator.name,
      operatorEmail: USERS.operator.email,
      producerName: USERS.producer.name,
      producerEmail: USERS.producer.email,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastMessageAt: nowIso(),
      messages: [
        {
          id: "msg-visual-002",
          text: "O app de validação está oscilando no portão 2.",
          message: "O app de validação está oscilando no portão 2.",
          authorRole: "OPERATOR",
          senderType: "OPERATOR",
          senderName: USERS.operator.name,
          targetType: "ALL",
          createdAt: nowIso(),
        },
        {
          id: "msg-visual-003",
          text: "Encaminhado ao Suporte Site por Operador Visual.\n\nJustificativa: Falha técnica no app de leitura.",
          message: "Encaminhado ao Suporte Site por Operador Visual.\n\nJustificativa: Falha técnica no app de leitura.",
          authorRole: "OPERATOR",
          senderType: "OPERATOR",
          senderName: USERS.operator.name,
          kind: "FORWARD",
          targetType: "ALL",
          createdAt: nowIso(),
        },
      ],
    },
    {
      id: "sup-visual-closed",
      protocol: "ASTRO-SUP-VISUAL-003",
      title: "Chamado já resolvido",
      subject: "Chamado já resolvido",
      category: "Atendimento",
      status: "RESOLVED",
      currentOwnerType: "PRODUCER",
      sourceType: "CUSTOMER",
      targetType: "ALL",
      eventId: EVENT.id,
      eventName: EVENT.name,
      event: EVENT,
      customerName: USERS.customer.name,
      customerEmail: USERS.customer.email,
      producerName: USERS.producer.name,
      producerEmail: USERS.producer.email,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastMessageAt: nowIso(),
      messages: [
        {
          id: "msg-visual-004",
          text: "Chamado encerrado por Produtor/Admin.",
          message: "Chamado encerrado por Produtor/Admin.",
          authorRole: "PRODUCER",
          senderType: "PRODUCER",
          senderName: USERS.producer.name,
          kind: "SYSTEM",
          targetType: "ALL",
          createdAt: nowIso(),
        },
      ],
    },
  ];
}

function asCustomerThread(ticket) {
  return {
    ...ticket,
    subject: ticket.subject || ticket.title,
    organizer: {
      id: "producer-visual",
      tradeName: "Produtor Visual",
      legalName: "Produtor Visual LTDA",
    },
    order: ORDER,
    messages: (ticket.messages || []).map((message) => ({
      ...message,
      message: message.message || message.text,
      senderType: message.senderType || message.authorRole,
      senderName: message.senderName || message.authorName,
    })),
  };
}

function extractTicketId(url, body) {
  const parts = url.pathname.split("/").filter(Boolean);
  const supportIndex = parts.findIndex((part) => part === "support");
  const afterSupport = supportIndex >= 0 ? parts.slice(supportIndex + 1) : parts;

  const candidate =
    afterSupport.find((part) => part.startsWith("sup-visual")) ||
    body.threadId ||
    body.ticketId ||
    body.supportId ||
    body.id;

  return candidate || "";
}

function addMessage(ticket, body, roleFallback, kind = "MESSAGE") {
  const message = body.message || body.text || body.reason || "Mensagem visual";
  ticket.messages = [
    ...(ticket.messages || []),
    {
      id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text: message,
      message,
      authorRole: body.role || body.authorRole || body.senderType || roleFallback,
      senderType: body.role || body.authorRole || body.senderType || roleFallback,
      senderName: body.name || body.authorName || body.senderName || "Usuário visual",
      kind,
      targetType: "ALL",
      createdAt: nowIso(),
    },
  ];
  ticket.updatedAt = nowIso();
  ticket.lastMessageAt = nowIso();
}

async function routeApi(route) {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method().toUpperCase();
  const pathname = url.pathname;
  const post = request.postData();

  let body = {};
  if (post) {
    try {
      body = JSON.parse(post);
    } catch {
      body = {};
    }
  }

  const json = (data, status = 200) => {
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  };

  if (pathname.includes("/events/admin-scope")) {
    return json([EVENT]);
  }

  if (pathname.includes("/orders/customer")) {
    return json([ORDER]);
  }

  if (pathname.includes("/operator-assignments")) {
    return json([ASSIGNMENT]);
  }

  if (pathname.includes("/support/customer") && method === "GET") {
    return json(tickets.map(asCustomerThread));
  }

  if (pathname.includes("/support/customer") && method === "POST") {
    const created = {
      ...tickets[0],
      id: `sup-visual-created-customer-${Date.now()}`,
      protocol: `ASTRO-SUP-CUSTOMER-${Date.now()}`,
      title: body.subject || body.title || "Chamado criado pelo cliente",
      subject: body.subject || body.title || "Chamado criado pelo cliente",
      status: "OPEN",
      currentOwnerType: "PRODUCER",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastMessageAt: nowIso(),
      messages: [],
    };
    addMessage(created, { ...body, message: body.message || "Mensagem criada pelo cliente" }, "CUSTOMER");
    tickets.unshift(created);
    return json(asCustomerThread(created), 201);
  }

  if (pathname.includes("/support") && method === "GET") {
    const eventId = url.searchParams.get("eventId") || "";
    const role = String(url.searchParams.get("role") || "").toUpperCase();

    let visible = [...tickets];

    if (eventId) {
      visible = visible.filter((ticket) => String(ticket.eventId) === eventId);
    }

    if (role === "SUPER_ADMIN") {
      visible = visible.filter((ticket) => String(ticket.currentOwnerType).toUpperCase() === "SUPER_ADMIN" || String(ticket.status).toUpperCase().includes("SUPER"));
    }

    return json(visible);
  }

  if (pathname.includes("/support") && method === "POST") {
    const idFromUrl = extractTicketId(url, body);
    const pathLower = pathname.toLowerCase();
    const isAction = Boolean(idFromUrl) || pathLower.includes("message") || pathLower.includes("reply") || pathLower.includes("forward") || pathLower.includes("resolve") || pathLower.includes("close");

    if (!isAction) {
      const created = {
        id: `sup-visual-created-${Date.now()}`,
        protocol: `ASTRO-SUP-${Date.now()}`,
        title: body.title || body.subject || "Chamado criado no teste",
        subject: body.title || body.subject || "Chamado criado no teste",
        category: body.category || "Suporte",
        status: "OPEN",
        currentOwnerType: body.currentOwnerType || "PRODUCER",
        sourceType: body.sourceType || body.createdByRole || "PRODUCER",
        targetType: "ALL",
        eventId: body.eventId || EVENT.id,
        eventName: body.eventName || EVENT.name,
        event: EVENT,
        customerName: body.customerName || USERS.customer.name,
        customerEmail: body.customerEmail || USERS.customer.email,
        operatorName: body.operatorName || USERS.operator.name,
        operatorEmail: body.operatorEmail || USERS.operator.email,
        producerName: body.producerName || USERS.producer.name,
        producerEmail: body.producerEmail || USERS.producer.email,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lastMessageAt: nowIso(),
        messages: [],
      };
      addMessage(created, { ...body, message: body.message || "Mensagem inicial" }, body.createdByRole || body.sourceType || "PRODUCER");
      tickets.unshift(created);
      return json(created, 201);
    }
  }

  if (pathname.includes("/support") && ["PATCH", "PUT", "POST"].includes(method)) {
    const ticketId = extractTicketId(url, body) || tickets[0]?.id;
    const pathLower = pathname.toLowerCase();
    let updated = null;

    tickets = tickets.map((ticket) => {
      if (ticket.id !== ticketId) return ticket;

      const next = { ...ticket, messages: [...(ticket.messages || [])] };

      if (pathLower.includes("forward")) {
        next.status = "FORWARDED_TO_SUPER_ADMIN";
        next.currentOwnerType = "SUPER_ADMIN";
        addMessage(next, {
          ...body,
          message: `Encaminhado ao Suporte Site.\n\nJustificativa: ${body.reason || body.message || "Justificativa visual"}`,
        }, body.role || "OPERATOR", "FORWARD");
      } else if (pathLower.includes("resolve") || pathLower.includes("close")) {
        next.status = "RESOLVED";
        addMessage(next, { ...body, message: body.message || "Chamado resolvido." }, body.role || "PRODUCER", "SYSTEM");
      } else {
        next.status = "IN_PROGRESS";
        addMessage(next, body, body.role || body.senderType || "PRODUCER");
      }

      updated = next;
      return next;
    });

    return json(updated || tickets[0] || {});
  }

  return json({});
}

async function setupPage(browser, user) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });

  await context.addInitScript(({ storedUser, eventId, eventName }) => {
    const token = `visual-token-${storedUser.role.toLowerCase()}`;
    sessionStorage.setItem("astro_session_token", token);
    sessionStorage.setItem("astro_session_user", JSON.stringify(storedUser));
    localStorage.setItem("astro_session_token", token);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(storedUser));
    localStorage.setItem("operator-selected-event-id", eventId);
    localStorage.setItem("operator-selected-event-name", eventName);
    localStorage.setItem(`operator-event-name-${eventId}`, eventName);
  }, { storedUser: user, eventId: EVENT.id, eventName: EVENT.name });

  await context.route("**/v1/**", routeApi);
  await context.route("**/api/**", routeApi);

  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(20000);

  return { context, page };
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${String(stepDone).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  log(`[PRINT] ${file}`);
}

async function goto(page, url, label) {
  log(`[ABRINDO] ${url} - ${label}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
}

async function maybeClick(page, textOrRegex, label) {
  const loc = page.getByText(textOrRegex).first();
  if (await loc.isVisible().catch(() => false)) {
    await loc.click();
    await page.waitForTimeout(600);
    log(`[OK] Clique: ${label}`);
    return true;
  }

  const btn = page.getByRole("button", { name: textOrRegex }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(600);
    log(`[OK] Clique botao: ${label}`);
    return true;
  }

  warn(`Nao achei clique: ${label}`);
  return false;
}

async function maybeFill(page, placeholderRegex, value, label) {
  const field = page.getByPlaceholder(placeholderRegex).first();
  if (await field.isVisible().catch(() => false)) {
    await field.fill(value);
    log(`[OK] Preencheu: ${label}`);
    return true;
  }

  const textbox = page.locator("textarea, input").filter({ hasText: "" }).last();
  if (await textbox.isVisible().catch(() => false)) {
    await textbox.fill(value);
    log(`[OK] Preencheu fallback: ${label}`);
    return true;
  }

  warn(`Nao achei campo: ${label}`);
  return false;
}

async function hasText(page, textOrRegex, label, hard = false) {
  const found = await page.getByText(textOrRegex).first().isVisible().catch(() => false);
  if (found) {
    log(`[OK] Verificado: ${label}`);
  } else if (hard) {
    fail(`Nao apareceu: ${label}`);
  } else {
    warn(`Nao apareceu: ${label}`);
  }
  return found;
}

async function clickButton(page, regex, label) {
  const button = page.getByRole("button", { name: regex }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    await page.waitForTimeout(700);
    log(`[OK] Botao: ${label}`);
    return true;
  }
  warn(`Nao achei botao: ${label}`);
  return false;
}

async function checkNoButton(page, regex, label) {
  const count = await page.getByRole("button", { name: regex }).count().catch(() => 0);
  if (count === 0) {
    log(`[OK] Nao existe: ${label}`);
  } else {
    fail(`Ainda existe botao proibido: ${label}`);
  }
}

async function checkDisabledInput(page, label) {
  const loc = page.locator("textarea[disabled], input[disabled]").first();
  if (await loc.isVisible().catch(() => false)) {
    log(`[OK] Campo bloqueado: ${label}`);
  } else {
    fail(`Campo nao ficou bloqueado: ${label}`);
  }
}

async function customerFlow(browser) {
  const { context, page } = await setupPage(browser, USERS.customer);
  await goto(page, "http://localhost:3000/support", "customer suporte");
  await hasText(page, /suporte|atendimento|tickets/i, "customer ve central", false);
  await shot(page, "customer-central");
  progress("customer abriu suporte");

  await maybeClick(page, /Abrir suporte|Novo suporte|Abrir chamado/i, "customer abrir suporte");
  await maybeFill(page, /Assunto|Titulo|Título/i, "Teste visual customer", "assunto customer");
  await maybeFill(page, /Mensagem|Descricao|Descrição/i, "Mensagem do customer para testar o fluxo completo.", "mensagem customer");
  await shot(page, "customer-formulario");
  progress("customer preencheu suporte");

  await clickButton(page, /Abrir chamado|Enviar|Criar/i, "customer envia chamado");
  await page.waitForTimeout(1200);
  await shot(page, "customer-enviado");
  progress("customer criou chamado");
  await context.close();
}

async function producerFlow(browser) {
  const { context, page } = await setupPage(browser, USERS.producer);
  await goto(page, "http://localhost:3000/admin/support", "produtor agenda suporte");
  await hasText(page, /Agenda|Suporte por evento|Central de suporte/i, "produtor ve agenda", true);
  await shot(page, "producer-agenda");
  progress("produtor abriu agenda");

  await maybeClick(page, EVENT.name, "produtor seleciona evento");
  await hasText(page, /Fichas|Chamados/i, "produtor ve fichas", true);
  await shot(page, "producer-evento-fichas");
  progress("produtor entrou no evento");

  await maybeClick(page, /Dúvida sobre entrada|Atendimento/i, "produtor seleciona chamado");
  await maybeFill(page, /Digite uma mensagem|resposta/i, "Resposta do produtor visível para todos.", "resposta produtor");
  await clickButton(page, /^Enviar$/i, "produtor envia resposta");
  await hasText(page, /Resposta do produtor visível para todos/i, "mensagem do produtor apareceu", true);
  await shot(page, "producer-respondeu");
  progress("produtor respondeu no chat");

  await clickButton(page, /Encaminhar Suporte Site/i, "produtor abre encaminhar");
  await maybeFill(page, /Explique brevemente|Justificativa/i, "Precisa de análise técnica do Suporte Site.", "justificativa produtor");
  await clickButton(page, /^Enviar$/i, "produtor envia justificativa");
  await hasText(page, /Justificativa|Suporte Site/i, "justificativa apareceu", true);
  await shot(page, "producer-encaminhou");
  progress("produtor encaminhou suporte");

  await clickButton(page, /Resolver chamado/i, "produtor resolve");
  await hasText(page, /histórico|resolvido|bloqueado/i, "resolvido virou historico", false);
  await shot(page, "producer-resolvido");
  progress("produtor resolveu chamado");
  await context.close();
}

async function operatorFlow(browser) {
  const { context, page } = await setupPage(browser, USERS.operator);
  await goto(page, `http://localhost:3000/operator/support?eventId=${EVENT.id}&eventName=${encodeURIComponent(EVENT.name)}&assignmentId=${ASSIGNMENT.id}`, "operador suporte do evento");
  await hasText(page, EVENT.name, "operador ve evento atual", true);
  await hasText(page, /Fichas do evento|Chamados/i, "operador ve chamados do evento", true);
  await shot(page, "operator-evento");
  progress("operador entrou pelo evento");

  await maybeClick(page, /Abrir técnico/i, "operador abre chamado tecnico");
  await hasText(page, /Evento atual|Abrir chamado com Suporte Site/i, "novo tecnico mostra evento atual", true);
  await hasText(page, EVENT.id, "novo tecnico mostra id do evento", true);
  await maybeFill(page, /Título do problema/i, "Teste técnico do operador", "titulo tecnico");
  await maybeFill(page, /Descrição do problema técnico/i, "Leitor de QR Code oscilando no portão 2.", "descricao tecnica");
  await shot(page, "operator-novo-tecnico");
  progress("operador preencheu tecnico");

  await clickButton(page, /Abrir chamado técnico/i, "operador cria tecnico");
  await page.waitForTimeout(1200);
  await shot(page, "operator-tecnico-criado");
  progress("operador criou chamado tecnico");
  await context.close();
}

async function superFlow(browser) {
  const { context, page } = await setupPage(browser, USERS.superAdmin);
  await goto(page, "http://localhost:3000/admin/super/support", "suporte site agenda");
  await hasText(page, /Suporte técnico por evento|Suporte Site/i, "suporte site ve agenda", true);
  await shot(page, "super-agenda");
  progress("suporte site abriu agenda");

  await maybeClick(page, EVENT.name, "suporte site seleciona evento");
  await hasText(page, /Fichas|Chamado técnico|Atendimento/i, "suporte site ve fichas", true);
  await checkNoButton(page, /Devolver cliente/i, "Devolver cliente");
  await checkNoButton(page, /Devolver produtor/i, "Devolver produtor");
  await checkNoButton(page, /Devolver operador/i, "Devolver operador");
  await shot(page, "super-evento-sem-botoes-devolver");
  progress("suporte site validou botoes removidos");

  await maybeFill(page, /Digite uma resposta técnica|Digite uma mensagem/i, "Resposta técnica do Suporte Site visível para todos.", "resposta suporte site");
  await clickButton(page, /^Enviar$/i, "suporte site envia resposta");
  await hasText(page, /Resposta técnica do Suporte Site/i, "mensagem suporte site apareceu", true);
  await shot(page, "super-respondeu");
  progress("suporte site respondeu");

  await clickButton(page, /Resolver técnico/i, "suporte site resolve tecnico");
  await page.waitForTimeout(900);
  await shot(page, "super-resolveu");
  progress("suporte site resolveu tecnico");
  await context.close();
}

async function rulesFlow(browser) {
  const { context, page } = await setupPage(browser, USERS.operator);
  await goto(page, "http://localhost:3000/operator/support", "operador sem evento");
  await hasText(page, /Entre pelo botão Suporte do evento|Selecione um evento|Evento obrigatório/i, "operador sem eventId bloqueado", true);
  await shot(page, "rules-operador-sem-evento");
  progress("regra operador sem evento");

  await goto(page, `http://localhost:3000/operator/support?eventId=${EVENT.id}&eventName=${encodeURIComponent(EVENT.name)}&assignmentId=${ASSIGNMENT.id}&ticket=sup-visual-closed`, "operador chamado resolvido");
  await hasText(page, /Histórico|resolvido/i, "resolvido aparece como historico", true);
  await checkDisabledInput(page, "campo bloqueado em resolvido");
  await shot(page, "rules-resolvido-bloqueado");
  progress("regra resolvido bloqueado");
  await context.close();
}

async function main() {
  log("[INFO] Walkthrough visual do suporte iniciado.");
  log(`[INFO] Prints: ${OUT_DIR}`);
  log(`[INFO] Relatorio: ${REPORT_PATH}`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 350,
  });

  try {
    await customerFlow(browser);
    await producerFlow(browser);
    await operatorFlow(browser);
    await superFlow(browser);
    await rulesFlow(browser);
  } finally {
    await browser.close().catch(() => {});
  }

  while (stepDone < totalSteps) {
    progress("finalizando...");
  }

  log("");
  log("[RESUMO]");
  log(`Avisos: ${warnings.length}`);
  warnings.forEach((item) => log(` - AVISO: ${item}`));
  log(`Falhas: ${issues.length}`);
  issues.forEach((item) => log(` - FALHA: ${item}`));

  if (issues.length > 0) {
    log("[RESULTADO] O walkthrough terminou, mas encontrou regras quebradas.");
    process.exitCode = 1;
    return;
  }

  log("[RESULTADO] Walkthrough concluido sem falhas criticas.");
}

main().catch((error) => {
  fail(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
});
'@

$RunnerScript = @'
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$ReportDir = Join-Path $WebRoot "test-results\reports"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$TranscriptPath = Join-Path $ReportDir "support-guided-walkthrough-runner-$Stamp.txt"

New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

function Test-Url {
  param([string] $Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Start-WebIfNeeded {
  if (Test-Url "http://localhost:3000") {
    Write-Host "[OK] WEB ja esta respondendo em http://localhost:3000"
    return $null
  }

  Write-Host "[INFO] WEB nao esta respondendo. Vou subir npm run dev em processo separado..."
  $logPath = Join-Path $ReportDir "support-guided-walkthrough-webserver-$Stamp.txt"

  $process = Start-Process -FilePath "powershell" `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "cd `"$WebRoot`"; npm run dev *> `"$logPath`"" `
    -WindowStyle Minimized `
    -PassThru

  $deadline = (Get-Date).AddSeconds(90)

  while ((Get-Date) -lt $deadline) {
    if (Test-Url "http://localhost:3000") {
      Write-Host "[OK] WEB subiu em http://localhost:3000"
      return $process
    }

    Start-Sleep -Seconds 2
  }

  throw "A WEB nao subiu em 90 segundos. Veja o log: $logPath"
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Walkthrough visual guiado sem Playwright Test Runner"
Write-Host "[INFO] Este modo evita o erro clear output / apply rebaselines."
Write-Host "[INFO] Transcript: $TranscriptPath"

Start-Transcript -Path $TranscriptPath -Force | Out-Null

$webProcess = $null

try {
  Set-Location $WebRoot

  if (!(Test-Path -LiteralPath ".\node_modules\playwright")) {
    Write-Host "[INFO] Instalando Playwright..."
    npm install -D @playwright/test
    if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar Playwright." }
  } else {
    Write-Host "[OK] Playwright ja instalado."
  }

  Write-Host "[INFO] Conferindo Chromium..."
  npx playwright install chromium
  if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar/conferir Chromium." }

  $webProcess = Start-WebIfNeeded

  Write-Host ""
  Write-Host "[INFO] Iniciando walkthrough com barra 0 a 100..."
  Write-Host ""

  node .\scripts\support-guided-walkthrough.cjs
  $exit = $LASTEXITCODE

  if ($exit -ne 0) {
    throw "Walkthrough visual encontrou falhas. Veja apps\web\test-results\support-guided-walkthrough e apps\web\test-results\reports."
  }

  Write-Host ""
  Write-Host "[OK] Walkthrough visual concluido."
  Write-Host "[OK] Prints:"
  Write-Host "  $WebRoot\test-results\support-guided-walkthrough"
  Write-Host "[OK] Relatorios:"
  Write-Host "  $WebRoot\test-results\reports"
} catch {
  Write-Host ""
  Write-Host "[ERRO] Walkthrough visual falhou."
  Write-Host "Veja prints e relatorios em:"
  Write-Host "  $WebRoot\test-results"
  throw
} finally {
  if ($webProcess -and !$webProcess.HasExited) {
    Write-Host "[INFO] Encerrando servidor WEB iniciado por este runner..."
    try { $webProcess.Kill() } catch {}
  }

  Stop-Transcript | Out-Null
  Write-Host "[INFO] Transcript salvo em:"
  Write-Host "       $TranscriptPath"
}
'@

Write-Utf8NoBom -Path $NodeScriptPath -Content $NodeScript
Write-Host "[OK] Script Node walkthrough criado: $NodeScriptPath"

Write-Utf8NoBom -Path $RunnerPath -Content $RunnerScript
Write-Host "[OK] Runner walkthrough criado: $RunnerPath"

# Tambem substitui o runner principal para evitar o Playwright Test Runner que esta travando.
Write-Utf8NoBom -Path $ProgressRunnerPath -Content $RunnerScript
Write-Host "[OK] run-support-guided-visual-tests.ps1 agora usa walkthrough sem travamento."

Write-Host ""
Write-Host "[OK] Walkthrough criado."
Write-Host ""
Write-Host "Rode assim:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-support-guided-walkthrough.ps1"
Write-Host ""
Write-Host "Ou pelo nome antigo:"
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-support-guided-visual-tests.ps1"

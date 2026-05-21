$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiRoot = Join-Path $ProjectRoot "apps\api"
$ControllerPath = Join-Path $ApiRoot "src\dashboard\dashboard.controller.ts"
$ServicePath = Join-Path $ApiRoot "src\dashboard\dashboard.service.ts"
$JsPath = Join-Path $ProjectRoot "run-financial-dashboard-real-api-tests.js"
$PsPath = Join-Path $ProjectRoot "run-financial-dashboard-real-api-tests.ps1"

function Write-Utf8NoBom {
  param([string] $Path, [AllowEmptyString()][string] $Content)
  $Dir = [System.IO.Path]::GetDirectoryName($Path)
  if (![string]::IsNullOrWhiteSpace($Dir) -and ![System.IO.Directory]::Exists($Dir)) {
    [System.IO.Directory]::CreateDirectory($Dir) | Out-Null
  }
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Backup-File {
  param([string] $Path, [string] $Tag)
  if (!(Test-Path -LiteralPath $Path)) { throw "Arquivo nao encontrado: $Path" }
  $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $BackupPath = "$Path.bak-$Tag-$Stamp"
  Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
  Write-Host "[OK] Backup criado: $BackupPath"
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Criando dashboard financeiro auditavel"

Backup-File -Path $ControllerPath -Tag "financial-dashboard"
$controller = [System.IO.File]::ReadAllText($ControllerPath)
$controller = $controller.Replace("import { Controller, Get, Req, UseGuards } from '@nestjs/common';", "import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';")
if ($controller -notmatch "Get\('financial'\)") {
  $method = @'

  @Get('financial')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getFinancialSummary(
    @Req() req: AuthenticatedRequest,
    @Query() query: Record<string, string>,
  ) {
    return this.dashboardService.getFinancialSummary(req.user, query);
  }
'@
  $controller = $controller.Replace("  @Get('summary/admin-scope')", $method + "`r`n`r`n" + "  @Get('summary/admin-scope')")
  if ($controller -notmatch "Get\('financial'\)") { throw "Nao consegui inserir endpoint /dashboard/financial" }
  Write-Host "[OK] Endpoint GET /dashboard/financial inserido."
} else {
  Write-Host "[OK] Endpoint /dashboard/financial ja existia."
}
Write-Utf8NoBom -Path $ControllerPath -Content $controller

Backup-File -Path $ServicePath -Tag "financial-dashboard"
$service = [System.IO.File]::ReadAllText($ServicePath)
if ($service -notmatch "getFinancialSummary") {
  $methods = @'

  private decimal(value: unknown) {
    return new Prisma.Decimal(String(value ?? 0));
  }

  private sumDecimals<T>(items: T[], selector: (item: T) => unknown) {
    return items.reduce(
      (sum, item) => sum.add(this.decimal(selector(item))),
      new Prisma.Decimal(0),
    );
  }

  private parseFinancialDateRange(query?: Record<string, string>) {
    const fromText = String(query?.from || query?.start || '').trim();
    const toText = String(query?.to || query?.end || '').trim();
    const createdAt: Prisma.DateTimeFilter = {};

    if (fromText) {
      const from = new Date(fromText);
      if (!Number.isNaN(from.getTime())) createdAt.gte = from;
    }

    if (toText) {
      const to = new Date(toText);
      if (!Number.isNaN(to.getTime())) createdAt.lte = to;
    }

    return Object.keys(createdAt).length ? createdAt : undefined;
  }

  private financialEventWhere(user: ScopeUser, query?: Record<string, string>): Prisma.EventWhereInput {
    const role = String(user?.role || '').toUpperCase();
    const eventId = String(query?.eventId || '').trim();
    const organizerId = String(query?.organizerId || '').trim();
    const and: Prisma.EventWhereInput[] = [];

    if (role !== 'SUPER_ADMIN') and.push({ organizer: this.organizerScopeWhere(user) });
    if (eventId) and.push({ id: eventId });
    if (organizerId) and.push({ organizerId });

    return and.length > 0 ? { AND: and } : {};
  }

  async getFinancialSummary(user: ScopeUser, query?: Record<string, string>) {
    const createdAt = this.parseFinancialDateRange(query);
    const eventWhere = this.financialEventWhere(user, query);
    const orderWhere: Prisma.OrderWhereInput = { event: eventWhere };
    const orderCreatedWhere: Prisma.OrderWhereInput = {
      ...orderWhere,
      ...(createdAt ? { createdAt } : {}),
    };

    const [
      paidPayments,
      activePaidOrders,
      canceledOrders,
      cancellations,
      bankWithdrawals,
      checkins,
      usedTickets,
      activeTickets,
    ] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'PAID', ...(createdAt ? { createdAt } : {}), order: orderWhere },
        include: { order: { include: { event: { include: { organizer: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: { ...orderCreatedWhere, status: 'PAID' },
        include: { event: { include: { organizer: true } }, items: { include: { tickets: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: { ...orderCreatedWhere, status: 'CANCELED' },
        include: { event: { include: { organizer: true } }, items: { include: { tickets: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticketCancellation.findMany({
        where: { ...(createdAt ? { createdAt } : {}), ticket: { orderItem: { order: orderWhere } } },
        include: {
          order: { include: { event: { include: { organizer: true } } } },
          ticket: { include: { orderItem: { include: { order: { include: { event: { include: { organizer: true } } } } } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.findMany({
        where: { type: 'DEBIT', source: 'WALLET_BANK_WITHDRAWAL', ...(createdAt ? { createdAt } : {}) },
        include: { user: { select: { id: true, name: true, email: true, cpf: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.checkin.count({
        where: { ...(createdAt ? { createdAt } : {}), ticket: { orderItem: { order: orderWhere } } },
      }),
      this.prisma.ticket.count({ where: { status: 'USED', orderItem: { order: orderWhere } } }),
      this.prisma.ticket.count({ where: { status: 'AVAILABLE', orderItem: { order: orderWhere } } }),
    ]);

    const paidPaymentsGrossTotal = this.sumDecimals(paidPayments, (p) => p.amount);
    const activePaidOrdersTotal = this.sumDecimals(activePaidOrders, (o) => o.totalAmount);
    const canceledOriginalTotal = this.sumDecimals(cancellations, (c) => c.originalAmount);
    const walletCreditTotal = this.sumDecimals(
      cancellations.filter((c) => c.mode === 'WALLET_80'),
      (c) => c.returnedAmount,
    );
    const cancellationRetainedTotal = canceledOriginalTotal.sub(walletCreditTotal);
    const bankWithdrawalGrossTotal = this.sumDecimals(bankWithdrawals, (tx) => tx.amount);
    const bankWithdrawalFeeTotal = bankWithdrawalGrossTotal.mul(new Prisma.Decimal(0.25));
    const bankPayoutNetTotal = bankWithdrawalGrossTotal.sub(bankWithdrawalFeeTotal);
    const totalRetainedTotal = cancellationRetainedTotal.add(bankWithdrawalFeeTotal);
    const totalTicketsInActivePaidOrders = activePaidOrders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.tickets.length, 0),
      0,
    );

    const byOrganizerMap = new Map<string, any>();
    const organizerInfo = (order: any) => {
      const organizer = order?.event?.organizer;
      return {
        id: String(organizer?.id || order?.event?.organizerId || 'unknown'),
        name: organizer?.tradeName || organizer?.legalName || organizer?.email || String(organizer?.id || order?.event?.organizerId || 'Organizador'),
      };
    };
    const rowFor = (order: any) => {
      const info = organizerInfo(order);
      if (!byOrganizerMap.has(info.id)) {
        byOrganizerMap.set(info.id, {
          organizerId: info.id,
          organizerName: info.name,
          paidPaymentsGrossTotal: new Prisma.Decimal(0),
          activePaidOrdersTotal: new Prisma.Decimal(0),
          canceledOriginalTotal: new Prisma.Decimal(0),
          walletCreditTotal: new Prisma.Decimal(0),
          cancellationRetainedTotal: new Prisma.Decimal(0),
          payments: 0,
        });
      }
      return byOrganizerMap.get(info.id);
    };

    for (const payment of paidPayments) {
      const row = rowFor(payment.order);
      row.paidPaymentsGrossTotal = row.paidPaymentsGrossTotal.add(payment.amount);
      row.payments += 1;
    }

    for (const order of activePaidOrders) {
      const row = rowFor(order);
      row.activePaidOrdersTotal = row.activePaidOrdersTotal.add(order.totalAmount);
    }

    for (const cancellation of cancellations) {
      const row = rowFor(cancellation.order || cancellation.ticket?.orderItem?.order);
      const original = this.decimal(cancellation.originalAmount);
      const returned = this.decimal(cancellation.returnedAmount);
      row.canceledOriginalTotal = row.canceledOriginalTotal.add(original);
      row.walletCreditTotal = row.walletCreditTotal.add(returned);
      row.cancellationRetainedTotal = row.cancellationRetainedTotal.add(original.sub(returned));
    }

    return {
      filters: {
        eventId: query?.eventId || null,
        organizerId: query?.organizerId || null,
        from: query?.from || query?.start || null,
        to: query?.to || query?.end || null,
      },
      rules: {
        cancellationWalletPercent: '80%',
        withdrawalBankPercentOfWallet: '75%',
        withdrawalBankPercentOfOriginalTicket: '60%',
        withdrawalFeePercentOfWallet: '25%',
        withdrawalFeePercentOfOriginalTicket: '20%',
        note: 'Cancelamento credita 80% na wallet. Saque debita o saldo da wallet e envia 75% dele ao banco, equivalente a 60% do valor original.',
      },
      totals: {
        paidPaymentsGrossTotal,
        activePaidOrdersTotal,
        paidPaymentsCount: paidPayments.length,
        activePaidOrdersCount: activePaidOrders.length,
        canceledOrdersCount: canceledOrders.length,
        canceledOriginalTotal,
        walletCreditTotal,
        cancellationRetainedTotal,
        bankWithdrawalGrossTotal,
        bankWithdrawalFeeTotal,
        bankPayoutNetTotal,
        totalRetainedTotal,
        checkins,
        usedTickets,
        activeTickets,
        totalTicketsInActivePaidOrders,
      },
      byOrganizer: Array.from(byOrganizerMap.values()).sort(
        (a, b) => Number(b.paidPaymentsGrossTotal) - Number(a.paidPaymentsGrossTotal),
      ),
      latest: {
        payments: paidPayments.slice(0, 10).map((p) => ({ id: p.id, orderId: p.orderId, amount: p.amount, status: p.status, createdAt: p.createdAt, eventId: p.order?.eventId, eventName: p.order?.event?.name })),
        cancellations: cancellations.slice(0, 10).map((c) => ({ id: c.id, ticketId: c.ticketId, orderId: c.orderId, mode: c.mode, originalAmount: c.originalAmount, returnedAmount: c.returnedAmount, status: c.status, createdAt: c.createdAt, eventId: c.order?.eventId, eventName: c.order?.event?.name })),
        bankWithdrawals: bankWithdrawals.slice(0, 10).map((tx) => {
          const grossAmount = this.decimal(tx.amount);
          const feeAmount = grossAmount.mul(new Prisma.Decimal(0.25));
          return { id: tx.id, userId: tx.userId, userName: tx.user?.name, userEmail: tx.user?.email, grossAmount, feeAmount, bankAmount: grossAmount.sub(feeAmount), createdAt: tx.createdAt, description: tx.description };
        }),
      },
      scopeNotes: {
        bankWithdrawals: 'Saques bancarios sao filtrados por periodo. Ainda nao possuem rateio por evento porque o saque usa saldo consolidado da wallet.',
      },
    };
  }
'@
  $insert = $service.IndexOf("  async getOperatorSummary()")
  if ($insert -lt 0) { throw "Nao encontrei ponto de insercao antes de getOperatorSummary." }
  $service = $service.Substring(0, $insert) + $methods + "`r`n" + $service.Substring($insert)
  Write-Host "[OK] getFinancialSummary inserido no DashboardService."
} else {
  Write-Host "[OK] getFinancialSummary ja existia."
}
Write-Utf8NoBom -Path $ServicePath -Content $service

$js = @'
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return process.env[name.toUpperCase()] || fallback;
}

const projectRoot = __dirname;
const baseUrl = (argValue("baseUrl", "http://localhost:3001/v1") || "").replace(/\/$/, "");
const eventId = argValue("eventId", "cb3d0e43-5866-4d0c-b892-860f8d53d02d");
const eventName = argValue("eventName", "Infantil Seed 487");
const ticketTypeIdArg = argValue("ticketTypeId", "");
const adminCpf = argValue("adminCpf", "11111111111");
const adminPassword = argValue("adminPassword", "123456");
const superCpf = argValue("superCpf", "44444444444");
const superPassword = argValue("superPassword", "123456");

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
const reportsDir = path.join(projectRoot, "apps", "web", "test-results", "reports");
fs.mkdirSync(reportsDir, { recursive: true });
const reportPath = path.join(reportsDir, `financial-dashboard-real-api-report-${stamp}.txt`);

let passed = 0;
let failed = 0;
let warnings = 0;

function log(message = "") {
  console.log(message);
  fs.appendFileSync(reportPath, message + "\n", "utf8");
}
function pass(message) { passed += 1; log(`[OK] ${message}`); }
function warn(message) { warnings += 1; log(`[AVISO] ${message}`); }
function fail(message) { failed += 1; log(`[FALHA] ${message}`); }
function assertTrue(condition, message) { condition ? pass(message) : fail(message); }
function money(value) { const n = Number(value || 0); return Math.round(n * 100) / 100; }
function asArray(value) { if (!value) return []; return Array.isArray(value) ? value : [value]; }
function normalizeCpf(value) { return String(value || "").replace(/\D/g, ""); }

async function api(method, route, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${route}`, { method, headers, body: body == null ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`Erro em ${method} ${route}: HTTP ${response.status} ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data;
}

async function login(label, cpf, password) {
  const data = await api("POST", "/auth/login", { cpf, password });
  if (!data?.accessToken) throw new Error(`Login ${label} nao retornou accessToken.`);
  pass(`Login ${label} realizado: ${data.user?.email} / ${data.user?.role}`);
  return { token: data.accessToken, user: data.user, cpf, password };
}

async function createTestCustomer(kind) {
  const random = Math.floor(100000000 + Math.random() * 899999999);
  const safeKind = String(kind || "user").replace(/[^a-z0-9]/gi, "").slice(0, 12) || "user";
  const safeStamp = String(stamp || "").replace(/[^0-9]/g, "").slice(0, 14);
  const cpf = `92${random}`;
  const email = `fd-${safeKind}-${safeStamp}-${random}@astroingressos.com.br`;
  const password = "Teste1234!";
  const name = `Cliente Financeiro Dashboard ${kind} ${random}`;
  const user = await api("POST", "/users", { name, email, cpf, password, role: "CUSTOMER" });
  assertTrue(Boolean(user?.id), `Usuario ${kind} criado: ${user?.email} / CPF ${cpf}`);
  return login(`CUSTOMER ${kind}`, cpf, password);
}

function getTickets(order) {
  const result = [];
  for (const item of asArray(order?.items)) for (const ticket of asArray(item?.tickets)) if (ticket) result.push(ticket);
  return result;
}
function firstTicket(order) { return getTickets(order)[0] || null; }
function countTickets(order) { return getTickets(order).length; }
function getTicketUnitPrice(order, ticketId) {
  for (const item of asArray(order?.items)) {
    for (const ticket of asArray(item?.tickets)) {
      if (String(ticket?.id) === String(ticketId)) {
        const unit = money(item?.unitPrice);
        if (unit > 0) return unit;
        const total = money(item?.totalPrice);
        const quantity = Number(item?.quantity || 0);
        if (total > 0 && quantity > 0) return money(total / quantity);
      }
    }
  }
  const total = money(order?.totalAmount);
  const qty = countTickets(order);
  return total > 0 && qty > 0 ? money(total / qty) : 0;
}
function resolveOrderResponse(response) { return response?.order || response; }

async function findOrCreateTicketType() {
  if (ticketTypeIdArg) {
    const ticketType = await api("GET", `/ticket-types/${ticketTypeIdArg}`);
    pass(`Tipo de ingresso informado carregado: ${ticketType.name} / ${ticketType.id}`);
    return ticketType;
  }
  const allTypes = asArray(await api("GET", "/ticket-types"));
  const candidates = allTypes
    .filter((item) => String(item?.eventId) === String(eventId) && Number(item?.quantity || 0) >= 3 && String(item?.status) === "ACTIVE")
    .sort((a, b) => Number(a?.displayOrder ?? 9999) - Number(b?.displayOrder ?? 9999));
  if (candidates.length > 0) {
    const selected = candidates[0];
    pass(`Tipo de ingresso existente escolhido: ${selected.name} / ${selected.id} / qtd=${selected.quantity}`);
    return selected;
  }
  warn("Nenhum tipo de ingresso com estoque suficiente encontrado. Vou criar lote de teste.");
  const newType = await api("POST", "/ticket-types", {
    eventId, name: `Ingresso teste dashboard financeiro ${stamp}`, lotLabel: "Lote teste dashboard financeiro",
    description: "Criado automaticamente para teste real do dashboard financeiro", price: "100.00", quantity: 50,
    minPerOrder: 1, maxPerOrder: 10, displayOrder: 999, feeAmount: "0.00", feeDescription: "Sem taxa no teste", isHidden: false, status: "ACTIVE",
  });
  pass(`Tipo de ingresso de teste criado: ${newType.name} / ${newType.id}`);
  return newType;
}

async function createPaidOrder(customer, ticketType, paymentMethod) {
  const customerName = customer.user?.name || "Cliente Financeiro";
  const customerEmail = customer.user?.email;
  if (!customerEmail) throw new Error("Usuario customer nao tem email.");
  const customerCpf = normalizeCpf(customer.user?.cpf || customer.cpf);
  const orderResponse = await api("POST", "/orders/customer", {
    eventId, customerName, customerEmail, customerCpf,
    items: [{ ticketTypeId: ticketType.id, quantity: 1, holders: [{ name: customerName, email: customerEmail, cpf: customerCpf }] }],
    useWalletBalance: false,
  }, customer.token);
  const order = resolveOrderResponse(orderResponse);
  assertTrue(Boolean(order?.id), `Pedido criado: ${order?.id}`);
  assertTrue(countTickets(order) === 1, "Pedido criou 1 ticket");
  const payment = await api("POST", `/payments/customer/${order.id}/finalize`, { method: paymentMethod }, customer.token);
  assertTrue(Boolean(payment?.id), `Pagamento finalizado: ${payment?.id}`);
  const paidOrder = await api("GET", `/orders/customer/${order.id}`, null, customer.token);
  const ticket = firstTicket(paidOrder);
  assertTrue(String(paidOrder.status) === "PAID", "Pedido ficou PAID");
  assertTrue(Boolean(ticket?.id), "Ticket encontrado no pedido pago");
  assertTrue(String(ticket?.status) === "AVAILABLE", "Ticket esta AVAILABLE");
  return { order: paidOrder, ticket };
}

async function main() {
  log("[INFO] Teste REAL do dashboard financeiro");
  log(`[INFO] BaseUrl: ${baseUrl}`);
  log(`[INFO] Evento: ${eventName} / ${eventId}`);
  log(`[INFO] Relatorio: ${reportPath}`);
  log("");
  const from = new Date(Date.now() - 3000).toISOString();
  try {
    try { await api("GET", ""); pass(`API respondeu em ${baseUrl}`); } catch { warn(`Nao consegui validar GET ${baseUrl}. Vou tentar os endpoints mesmo assim.`); }
    const superAdmin = await login("SUPER_ADMIN", superCpf, superPassword);
    const admin = await login("ADMIN validador", adminCpf, adminPassword);
    const ticketType = await findOrCreateTicketType();

    log(""); log("============================================================"); log("[FLUXO 1] Criar venda ativa com check-in"); log("============================================================");
    const activeCustomer = await createTestCustomer("ativo");
    const activeCreated = await createPaidOrder(activeCustomer, ticketType, "PIX_TESTE_DASHBOARD_ATIVO");
    const activeOrder = activeCreated.order;
    const activeTicket = activeCreated.ticket;
    const activeUnitPrice = getTicketUnitPrice(activeOrder, activeTicket.id);
    const activeQr = await api("GET", `/tickets/customer/${activeTicket.id}/qr-token`, null, activeCustomer.token);
    assertTrue(Boolean(activeQr?.token), "QR gerado para venda ativa");
    const checkin = await api("POST", "/tickets/validate", { token: activeQr.token, gate: "Teste dashboard financeiro", markAsUsed: true }, admin.token);
    assertTrue(Boolean(checkin?.valid), "Check-in real validado para dashboard");
    assertTrue(String(checkin?.ticket?.status) === "USED", "Ticket ativo ficou USED");

    log(""); log("============================================================"); log("[FLUXO 2] Criar cancelamento, credito wallet e saque banco"); log("============================================================");
    const cancelCustomer = await createTestCustomer("cancelado");
    const cancelCreated = await createPaidOrder(cancelCustomer, ticketType, "PIX_TESTE_DASHBOARD_CANCEL");
    const cancelOrder = cancelCreated.order;
    const cancelTicket = cancelCreated.ticket;
    const cancelUnitPrice = getTicketUnitPrice(cancelOrder, cancelTicket.id);
    const walletExpected = money(cancelUnitPrice * 0.8);
    const bankExpected = money(cancelUnitPrice * 0.6);
    const withdrawalFeeExpected = money(walletExpected - bankExpected);
    const cancellationRetainedExpected = money(cancelUnitPrice - walletExpected);
    const canceled = await api("PATCH", `/orders/customer/${cancelOrder.id}/cancel`, { mode: "WALLET_80" }, cancelCustomer.token);
    assertTrue(String(canceled.status) === "CANCELED", "Pedido cancelado ficou CANCELED");
    const withdrawal = await api("POST", "/users/me/wallet/withdraw-bank", { amount: walletExpected, bankPixKey: "dashboard-financeiro@astroingressos.com.br" }, cancelCustomer.token);
    assertTrue(String(withdrawal.status) === "REQUESTED", "Saque bancario ficou REQUESTED");
    assertTrue(money(withdrawal.grossAmount) === walletExpected, "Saque bruto bate com credito da wallet");
    assertTrue(money(withdrawal.bankAmount) === bankExpected, "Saque liquido banco bate com 60% original");
    assertTrue(money(withdrawal.feeAmount) === withdrawalFeeExpected, "Taxa do saque bate com 20% original");

    log(""); log("============================================================"); log("[FLUXO 3] Consultar dashboard financeiro auditavel"); log("============================================================");
    const to = new Date(Date.now() + 3000).toISOString();
    const query = new URLSearchParams({ from, to }).toString();
    const dashboard = await api("GET", `/dashboard/financial?${query}`, null, superAdmin.token);
    const totals = dashboard.totals || {};
    log("[INFO] Totais retornados:");
    log(JSON.stringify(totals, null, 2));
    const expectedPaidPaymentsGross = money(activeUnitPrice + cancelUnitPrice);
    const expectedActivePaidOrders = money(activeUnitPrice);
    const expectedCanceledOriginal = money(cancelUnitPrice);
    const expectedWalletCredit = money(walletExpected);
    const expectedCancellationRetained = money(cancellationRetainedExpected);
    const expectedBankWithdrawalGross = money(walletExpected);
    const expectedBankWithdrawalFee = money(withdrawalFeeExpected);
    const expectedBankNet = money(bankExpected);
    const expectedTotalRetained = money(cancellationRetainedExpected + withdrawalFeeExpected);
    assertTrue(money(totals.paidPaymentsGrossTotal) === expectedPaidPaymentsGross, `Dashboard soma pagamentos pagos: ${expectedPaidPaymentsGross}`);
    assertTrue(money(totals.activePaidOrdersTotal) === expectedActivePaidOrders, `Dashboard soma pedidos ativos pagos: ${expectedActivePaidOrders}`);
    assertTrue(Number(totals.activePaidOrdersCount) === 1, "Dashboard conta 1 pedido ativo pago");
    assertTrue(Number(totals.canceledOrdersCount) === 1, "Dashboard conta 1 pedido cancelado");
    assertTrue(money(totals.canceledOriginalTotal) === expectedCanceledOriginal, `Dashboard soma valor original cancelado: ${expectedCanceledOriginal}`);
    assertTrue(money(totals.walletCreditTotal) === expectedWalletCredit, `Dashboard soma credito wallet 80%: ${expectedWalletCredit}`);
    assertTrue(money(totals.cancellationRetainedTotal) === expectedCancellationRetained, `Dashboard soma retencao inicial 20%: ${expectedCancellationRetained}`);
    assertTrue(money(totals.bankWithdrawalGrossTotal) === expectedBankWithdrawalGross, `Dashboard soma saque bruto wallet: ${expectedBankWithdrawalGross}`);
    assertTrue(money(totals.bankWithdrawalFeeTotal) === expectedBankWithdrawalFee, `Dashboard soma taxa saque 20% original: ${expectedBankWithdrawalFee}`);
    assertTrue(money(totals.bankPayoutNetTotal) === expectedBankNet, `Dashboard soma envio banco 60% original: ${expectedBankNet}`);
    assertTrue(money(totals.totalRetainedTotal) === expectedTotalRetained, `Dashboard soma retencao total: ${expectedTotalRetained}`);
    assertTrue(Number(totals.checkins) >= 1, "Dashboard conta check-in do periodo");
    assertTrue(Number(totals.usedTickets) >= 1, "Dashboard conta ticket usado");
    assertTrue(String(dashboard.rules?.cancellationWalletPercent) === "80%", "Dashboard informa regra wallet 80%");
    assertTrue(String(dashboard.rules?.withdrawalBankPercentOfOriginalTicket) === "60%", "Dashboard informa regra banco 60% original");
    log("");
    log("[INFO] Fluxo financeiro auditado:");
    log(`Venda ativa: order=${activeOrder.id}, ticket=${activeTicket.id}, valor=${activeUnitPrice}`);
    log(`Cancelamento: order=${cancelOrder.id}, ticket=${cancelTicket.id}, original=${cancelUnitPrice}, wallet=${walletExpected}, banco=${bankExpected}, taxa=${withdrawalFeeExpected}`);
  } catch (error) {
    fail(error.message);
  }
  log(""); log("============================================================"); log("[RESUMO]"); log(`Passou: ${passed}`); log(`Avisos: ${warnings}`); log(`Falhas: ${failed}`); log(`Relatorio: ${reportPath}`); log("============================================================");
  if (failed > 0) process.exitCode = 1;
}
main();
'@

$ps = @'
param(
  [string] $BaseUrl = "http://localhost:3001/v1",
  [string] $EventId = "cb3d0e43-5866-4d0c-b892-860f8d53d02d",
  [string] $EventName = "Infantil Seed 487",
  [string] $TicketTypeId = "",
  [string] $AdminCpf = "11111111111",
  [string] $AdminPassword = "123456",
  [string] $SuperCpf = "44444444444",
  [string] $SuperPassword = "123456"
)
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$JsPath = Join-Path $ProjectRoot "run-financial-dashboard-real-api-tests.js"
if (!(Test-Path -LiteralPath $JsPath)) { throw "Nao encontrei o runner Node: $JsPath" }
$argsList = @($JsPath, "--baseUrl", $BaseUrl, "--eventId", $EventId, "--eventName", $EventName, "--adminCpf", $AdminCpf, "--adminPassword", $AdminPassword, "--superCpf", $SuperCpf, "--superPassword", $SuperPassword)
if (![string]::IsNullOrWhiteSpace($TicketTypeId)) { $argsList += @("--ticketTypeId", $TicketTypeId) }
node @argsList
if ($LASTEXITCODE -ne 0) { throw "Teste Node do dashboard financeiro terminou com erro." }
'@

Write-Utf8NoBom -Path $JsPath -Content $js
Write-Utf8NoBom -Path $PsPath -Content $ps
Write-Host "[OK] Runner Node criado: $JsPath"
Write-Host "[OK] Wrapper PowerShell criado: $PsPath"

Set-Location $ApiRoot
Write-Host "[INFO] Rodando build da API..."
npm run build *> log-api-financial-dashboard-build.txt
$BuildLogPath = Join-Path $ApiRoot "log-api-financial-dashboard-build.txt"
$Errors = Select-String -Path $BuildLogPath -Pattern "error|Error:|Failed|Cannot find|Type error|Module not found|financial|dashboard|Prisma|wallet|withdrawal" -Context 2,3
if ($Errors) {
  Write-Host "[AVISO] Build gerou linhas filtradas. Veja abaixo:" -ForegroundColor Yellow
  $Errors | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "[OK] Build sem erros filtrados."
}
Write-Host ""
Write-Host "[OK] Dashboard financeiro preparado."
Write-Host ""
Write-Host "Agora reinicie a API e rode:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-financial-dashboard-real-api-tests.ps1"

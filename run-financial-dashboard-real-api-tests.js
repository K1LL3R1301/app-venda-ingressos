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
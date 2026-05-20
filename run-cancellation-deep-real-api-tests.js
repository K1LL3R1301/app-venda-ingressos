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

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
const reportsDir = path.join(projectRoot, "apps", "web", "test-results", "reports");
fs.mkdirSync(reportsDir, { recursive: true });
const reportPath = path.join(reportsDir, `cancellation-deep-node-report-${stamp}.txt`);

let passed = 0;
let failed = 0;
let warnings = 0;

function log(message = "") {
  console.log(message);
  fs.appendFileSync(reportPath, message + "\n", "utf8");
}

function pass(message) {
  passed += 1;
  log(`[OK] ${message}`);
}

function warn(message) {
  warnings += 1;
  log(`[AVISO] ${message}`);
}

function fail(message) {
  failed += 1;
  log(`[FALHA] ${message}`);
}

function assertTrue(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

function money(value) {
  const n = Number(value || 0);
  return Math.round(n * 100) / 100;
}

function normalizeCpf(value) {
  return String(value || "").replace(/\D/g, "");
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function api(method, route, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body === undefined || body === null ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Erro em ${method} ${route}: HTTP ${response.status} ${detail}`);
  }

  return data;
}

async function apiExpectError(method, route, body, token) {
  try {
    const result = await api(method, route, body, token);
    return { ok: true, result, error: null };
  } catch (error) {
    return { ok: false, result: null, error: error.message };
  }
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
  const cpf = `94${random}`;
  const email = `cd-${safeKind}-${safeStamp}-${random}@astroingressos.com.br`;
  const password = "Teste1234!";
  const name = `Cliente Cancel Deep Node ${kind} ${random}`;

  const user = await api("POST", "/users", {
    name,
    email,
    cpf,
    password,
    role: "CUSTOMER",
  });

  assertTrue(Boolean(user?.id), `Usuario ${kind} criado: ${user?.email} / CPF ${cpf}`);
  return login(`CUSTOMER ${kind}`, cpf, password);
}

function getTickets(order) {
  const result = [];
  for (const item of asArray(order?.items)) {
    for (const ticket of asArray(item?.tickets)) {
      if (ticket) result.push(ticket);
    }
  }
  return result;
}

function firstTicket(order) {
  return getTickets(order)[0] || null;
}

function countTickets(order) {
  return getTickets(order).length;
}

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

function resolveOrderResponse(response) {
  return response?.order || response;
}

async function findOrCreateTicketType() {
  if (ticketTypeIdArg) {
    const ticketType = await api("GET", `/ticket-types/${ticketTypeIdArg}`);
    pass(`Tipo de ingresso informado carregado: ${ticketType.name} / ${ticketType.id}`);
    return ticketType;
  }

  const allTypes = asArray(await api("GET", "/ticket-types"));
  const candidates = allTypes
    .filter((item) =>
      String(item?.eventId) === String(eventId) &&
      Number(item?.quantity || 0) >= 3 &&
      String(item?.status) === "ACTIVE",
    )
    .sort((a, b) => Number(a?.displayOrder ?? 9999) - Number(b?.displayOrder ?? 9999));

  if (candidates.length > 0) {
    const selected = candidates[0];
    pass(`Tipo de ingresso existente escolhido: ${selected.name} / ${selected.id} / qtd=${selected.quantity}`);
    return selected;
  }

  warn("Nenhum tipo de ingresso com estoque suficiente encontrado. Vou criar lote de teste.");
  const newType = await api("POST", "/ticket-types", {
    eventId,
    name: `Ingresso teste cancelamento profundo node ${stamp}`,
    lotLabel: "Lote teste cancelamento profundo node",
    description: "Criado automaticamente para teste aprofundado de cancelamento via Node",
    price: "100.00",
    quantity: 50,
    minPerOrder: 1,
    maxPerOrder: 10,
    displayOrder: 999,
    feeAmount: "0.00",
    feeDescription: "Sem taxa no teste",
    isHidden: false,
    status: "ACTIVE",
  });

  pass(`Tipo de ingresso de teste criado: ${newType.name} / ${newType.id}`);
  return newType;
}

async function createPaidOrderWithTickets(customer, ticketType, quantity, paymentMethod) {
  const customerName = customer.user?.name || "Cliente Cancel Deep Node";
  const customerEmail = customer.user?.email;
  if (!customerEmail) throw new Error("Usuario customer nao tem email.");

  const customerCpf = normalizeCpf(customer.user?.cpf || customer.cpf);
  const holders = [];
  for (let i = 1; i <= quantity; i += 1) {
    holders.push({
      name: `${customerName} Ticket ${i}`,
      email: customerEmail,
      cpf: customerCpf,
    });
  }

  const beforeType = await api("GET", `/ticket-types/${ticketType.id}`);

  const orderResponse = await api("POST", "/orders/customer", {
    eventId,
    customerName,
    customerEmail,
    customerCpf,
    items: [
      {
        ticketTypeId: ticketType.id,
        quantity,
        holders,
      },
    ],
    useWalletBalance: false,
  }, customer.token);

  const order = resolveOrderResponse(orderResponse);
  assertTrue(Boolean(order?.id), `Pedido criado com ${quantity} ticket(s): ${order?.id}`);
  assertTrue(asArray(order?.items).length > 0, "Pedido criado com item");
  assertTrue(countTickets(order) === quantity, `Pedido criou ${quantity} ticket(s)`);

  const afterCreateType = await api("GET", `/ticket-types/${ticketType.id}`);
  assertTrue(
    Number(afterCreateType.quantity) === Number(beforeType.quantity) - quantity,
    `Estoque decrementou ${quantity} apos criar pedido`,
  );

  const payment = await api("POST", `/payments/customer/${order.id}/finalize`, {
    method: paymentMethod,
  }, customer.token);

  assertTrue(Boolean(payment?.id), `Pagamento finalizado: ${payment?.id}`);

  const paidOrder = await api("GET", `/orders/customer/${order.id}`, null, customer.token);
  const tickets = getTickets(paidOrder);

  pass(`Pedido pago retornado: ${paidOrder.id} / status=${paidOrder.status} / tickets=${tickets.length}`);
  assertTrue(String(paidOrder.status) === "PAID", "Pedido ficou PAID");
  assertTrue(tickets.length === quantity, `Pedido pago tem ${quantity} ticket(s)`);
  assertTrue(tickets.filter((ticket) => String(ticket.status) === "AVAILABLE").length === quantity, "Todos os tickets estao AVAILABLE");

  return { order: paidOrder, tickets, beforeType, afterCreateType };
}

function getWalletCreditForTicket(wallet, ticketId) {
  return asArray(wallet?.transactions).find((tx) =>
    String(tx?.source) === "TICKET_CANCELLATION" &&
    String(tx?.sourceId) === String(ticketId),
  ) || null;
}

function getCancellationForTicket(order, ticketId) {
  return asArray(order?.cancellations).find((cancel) => String(cancel?.ticketId) === String(ticketId)) || null;
}

function assertWalletCredit(wallet, ticketId, expectedAmount) {
  const tx = getWalletCreditForTicket(wallet, ticketId);
  assertTrue(Boolean(tx), `Wallet recebeu credito para ticket ${ticketId}`);
  if (!tx) return;

  assertTrue(String(tx.type) === "CREDIT", "Transacao da wallet e CREDIT");
  assertTrue(String(tx.source) === "TICKET_CANCELLATION", "Transacao da wallet tem source TICKET_CANCELLATION");
  assertTrue(money(tx.amount) === money(expectedAmount), `Credito da wallet bate com esperado: ${money(expectedAmount)}`);
}

function assertNoWalletCredit(wallet, ticketId) {
  const tx = getWalletCreditForTicket(wallet, ticketId);
  assertTrue(!tx, `Nao houve credito de wallet para ticket ${ticketId}`);
}

async function main() {
  log("[INFO] Teste APROFUNDADO Node de cancelamento");
  log(`[INFO] BaseUrl: ${baseUrl}`);
  log(`[INFO] Evento: ${eventName} / ${eventId}`);
  log(`[INFO] Relatorio: ${reportPath}`);
  log("");

  try {
    try {
      await api("GET", "");
      pass(`API respondeu em ${baseUrl}`);
    } catch {
      warn(`Nao consegui validar GET ${baseUrl}. Vou tentar os endpoints mesmo assim.`);
    }

    const ticketType = await findOrCreateTicketType();
    const admin = await login("ADMIN validador", adminCpf, adminPassword);

    log("");
    log("============================================================");
    log("[FLUXO 1] Cancelamento total com WALLET_80");
    log("============================================================");

    const walletCustomer = await createTestCustomer("wallet80");
    const walletCreated = await createPaidOrderWithTickets(walletCustomer, ticketType, 1, "PIX_TESTE_WALLET80");
    const walletOrder = walletCreated.order;
    const walletTicket = walletCreated.tickets[0];
    const walletUnitPrice = getTicketUnitPrice(walletOrder, walletTicket.id);
    const walletExpected = money(walletUnitPrice * 0.8);

    log(`[INFO] WALLET_80 unitPrice=${walletUnitPrice}, expected=${walletExpected}`);

    const walletCanceled = await api("PATCH", `/orders/customer/${walletOrder.id}/cancel`, {
      mode: "WALLET_80",
    }, walletCustomer.token);

    assertTrue(String(walletCanceled.status) === "CANCELED", "Pedido WALLET_80 ficou CANCELED");
    const walletCanceledTicket = firstTicket(walletCanceled);
    assertTrue(String(walletCanceledTicket?.status) === "CANCELED", "Ticket WALLET_80 ficou CANCELED");

    const walletCancellation = getCancellationForTicket(walletCanceled, walletTicket.id);
    assertTrue(Boolean(walletCancellation), "Cancelamento WALLET_80 gerou registro");
    if (walletCancellation) {
      assertTrue(String(walletCancellation.mode) === "WALLET_80", "Registro WALLET_80 tem mode correto");
      assertTrue(money(walletCancellation.originalAmount) === walletUnitPrice, "Registro WALLET_80 guardou valor original");
      assertTrue(money(walletCancellation.returnedAmount) === walletExpected, "Registro WALLET_80 guardou 80%");
    }

    const walletSummary = await api("GET", "/users/me/wallet", null, walletCustomer.token);
    assertWalletCredit(walletSummary, walletTicket.id, walletExpected);

    const walletQr = await apiExpectError("GET", `/tickets/customer/${walletTicket.id}/qr-token`, null, walletCustomer.token);
    assertTrue(!walletQr.ok, "QR bloqueado apos cancelamento WALLET_80");

    log("");
    log("============================================================");
    log("[FLUXO 2] Cancelamento total com REFUND_60 banco");
    log("============================================================");

    const bankCustomer = await createTestCustomer("banco60");
    const bankCreated = await createPaidOrderWithTickets(bankCustomer, ticketType, 1, "PIX_TESTE_REFUND60");
    const bankOrder = bankCreated.order;
    const bankTicket = bankCreated.tickets[0];
    const bankUnitPrice = getTicketUnitPrice(bankOrder, bankTicket.id);
    const bankExpected = money(bankUnitPrice * 0.6);

    log(`[INFO] REFUND_60 unitPrice=${bankUnitPrice}, expected=${bankExpected}`);

    const bankWalletBefore = await api("GET", "/users/me/wallet", null, bankCustomer.token);

    const bankCanceled = await api("PATCH", `/orders/customer/${bankOrder.id}/cancel`, {
      mode: "REFUND_60",
    }, bankCustomer.token);

    assertTrue(String(bankCanceled.status) === "CANCELED", "Pedido REFUND_60 ficou CANCELED");
    const bankCanceledTicket = firstTicket(bankCanceled);
    assertTrue(String(bankCanceledTicket?.status) === "CANCELED", "Ticket REFUND_60 ficou CANCELED");

    const bankCancellation = getCancellationForTicket(bankCanceled, bankTicket.id);
    assertTrue(Boolean(bankCancellation), "Cancelamento REFUND_60 gerou registro");
    if (bankCancellation) {
      assertTrue(String(bankCancellation.mode) === "REFUND_60", "Registro REFUND_60 tem mode correto");
      assertTrue(money(bankCancellation.originalAmount) === bankUnitPrice, "Registro REFUND_60 guardou valor original");
      assertTrue(money(bankCancellation.returnedAmount) === bankExpected, "Registro REFUND_60 guardou 60% para banco");
    }

    const bankWalletAfter = await api("GET", "/users/me/wallet", null, bankCustomer.token);
    assertNoWalletCredit(bankWalletAfter, bankTicket.id);
    assertTrue(money(bankWalletAfter.balance) === money(bankWalletBefore.balance), "REFUND_60 nao alterou saldo da wallet");

    const bankQr = await apiExpectError("GET", `/tickets/customer/${bankTicket.id}/qr-token`, null, bankCustomer.token);
    assertTrue(!bankQr.ok, "QR bloqueado apos cancelamento REFUND_60");

    log("");
    log("============================================================");
    log("[FLUXO 3] Cancelamento parcial de 1 ticket em pedido com 2");
    log("============================================================");

    const partialCustomer = await createTestCustomer("parcial");
    const partialCreated = await createPaidOrderWithTickets(partialCustomer, ticketType, 2, "PIX_TESTE_CANCELAMENTO_PARCIAL");
    const partialOrder = partialCreated.order;
    const partialCancel = partialCreated.tickets[0];
    const partialKeep = partialCreated.tickets[1];
    const partialUnitPrice = getTicketUnitPrice(partialOrder, partialCancel.id);
    const partialExpectedWallet = money(partialUnitPrice * 0.8);

    const partialCancelled = await api("PATCH", `/orders/customer/tickets/${partialCancel.id}/cancel`, {
      mode: "WALLET_80",
    }, partialCustomer.token);

    assertTrue(String(partialCancelled.status) === "PAID", "Pedido parcial continua PAID");
    const partialTickets = getTickets(partialCancelled);
    assertTrue(partialTickets.filter((ticket) => String(ticket.status) === "CANCELED").length === 1, "Pedido parcial tem 1 ticket CANCELED");
    assertTrue(partialTickets.filter((ticket) => String(ticket.status) === "AVAILABLE").length === 1, "Pedido parcial manteve 1 ticket AVAILABLE");

    const partialWallet = await api("GET", "/users/me/wallet", null, partialCustomer.token);
    assertWalletCredit(partialWallet, partialCancel.id, partialExpectedWallet);

    const partialQrCanceled = await apiExpectError("GET", `/tickets/customer/${partialCancel.id}/qr-token`, null, partialCustomer.token);
    assertTrue(!partialQrCanceled.ok, "QR do ticket cancelado parcial foi bloqueado");

    const partialQrKept = await api("GET", `/tickets/customer/${partialKeep.id}/qr-token`, null, partialCustomer.token);
    assertTrue(Boolean(partialQrKept?.token), "QR do ticket mantido continua gerando");

    log("");
    log("============================================================");
    log("[FLUXO 4] Cancelamento de ticket usado deve ser bloqueado");
    log("============================================================");

    const usedCustomer = await createTestCustomer("usado");
    const usedCreated = await createPaidOrderWithTickets(usedCustomer, ticketType, 1, "PIX_TESTE_USADO_BLOQUEIO");
    const usedOrder = usedCreated.order;
    const usedTicket = usedCreated.tickets[0];

    const usedQr = await api("GET", `/tickets/customer/${usedTicket.id}/qr-token`, null, usedCustomer.token);
    assertTrue(Boolean(usedQr?.token), "QR gerado para ticket que sera usado");

    const checkin = await api("POST", "/tickets/validate", {
      token: usedQr.token,
      gate: "Teste bloqueio cancelamento usado",
      markAsUsed: true,
    }, admin.token);

    assertTrue(Boolean(checkin?.valid), "Check-in real validado");
    assertTrue(String(checkin?.ticket?.status) === "USED", "Ticket ficou USED");

    const cancelUsedTicket = await apiExpectError("PATCH", `/orders/customer/tickets/${usedTicket.id}/cancel`, {
      mode: "WALLET_80",
    }, usedCustomer.token);

    assertTrue(!cancelUsedTicket.ok, "Cancelamento direto de ticket USED foi bloqueado");
    assertTrue(/utilizado|usado|USED/i.test(cancelUsedTicket.error || ""), "Mensagem de bloqueio do ticket USED foi retornada");

    log("");
    log("============================================================");
    log("[FLUXO 5] Cancelamento cancela transferencia pendente");
    log("============================================================");

    const transferCustomer = await createTestCustomer("transfer-pendente-remetente");
    const transferRecipient = await createTestCustomer("transfer-pendente-destinatario");
    const transferCreated = await createPaidOrderWithTickets(transferCustomer, ticketType, 1, "PIX_TESTE_CANCELA_TRANSFER");
    const transferOrder = transferCreated.order;
    const transferTicket = transferCreated.tickets[0];

    const transfer = await api("POST", `/tickets/customer/${transferTicket.id}/transfer`, {
      targetCpf: transferRecipient.cpf,
    }, transferCustomer.token);

    assertTrue(String(transfer.status) === "PENDING_ACCEPTANCE", "Transferencia ficou pendente antes do cancelamento");

    const transferCancel = await api("PATCH", `/orders/customer/tickets/${transferTicket.id}/cancel`, {
      mode: "WALLET_80",
    }, transferCustomer.token);

    assertTrue(String(transferCancel.status) === "CANCELED", "Pedido com transferencia pendente ficou CANCELED apos cancelar unico ticket");

    const transferAfterCancel = await api("GET", `/tickets/customer/transfers/${transfer.id}`, null, transferCustomer.token);
    assertTrue(String(transferAfterCancel.status) === "CANCELED", "Transferencia pendente foi cancelada junto com o ticket");
    assertTrue(/Ticket cancelado|cancelado/i.test(String(transferAfterCancel.responseReason || "")), "Transferencia recebeu motivo de cancelamento por ticket");

    log("");
    log("[INFO] Cancelamento aprofundado concluido:");
    log(`WALLET_80: order=${walletOrder.id}, ticket=${walletTicket.id}, credito=${walletExpected}`);
    log(`REFUND_60 banco: order=${bankOrder.id}, ticket=${bankTicket.id}, valor=${bankExpected}`);
    log(`Parcial: order=${partialOrder.id}, cancelado=${partialCancel.id}, mantido=${partialKeep.id}`);
    log(`Usado bloqueado: order=${usedOrder.id}, ticket=${usedTicket.id}`);
    log(`Transfer pendente cancelada: order=${transferOrder.id}, transfer=${transfer.id}`);
  } catch (error) {
    fail(error.message);
  }

  log("");
  log("============================================================");
  log("[RESUMO]");
  log(`Passou: ${passed}`);
  log(`Avisos: ${warnings}`);
  log(`Falhas: ${failed}`);
  log(`Relatorio: ${reportPath}`);
  log("============================================================");

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
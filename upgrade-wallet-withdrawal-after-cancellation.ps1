$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiRoot = Join-Path $ProjectRoot "apps\api"

$CancelOrderDtoPath = Join-Path $ApiRoot "src\orders\dto\cancel-order.dto.ts"
$CancelTicketDtoPath = Join-Path $ApiRoot "src\orders\dto\cancel-ticket.dto.ts"
$OrdersServicePath = Join-Path $ApiRoot "src\orders\orders.service.ts"
$UsersControllerPath = Join-Path $ApiRoot "src\users\users.controller.ts"
$UsersServicePath = Join-Path $ApiRoot "src\users\users.service.ts"

$JsRunnerPath = Join-Path $ProjectRoot "run-cancellation-wallet-withdraw-real-api-tests.js"
$PsRunnerPath = Join-Path $ProjectRoot "run-cancellation-wallet-withdraw-real-api-tests.ps1"

function Write-Utf8NoBom {
  param(
    [string] $Path,
    [AllowEmptyString()][string] $Content
  )

  $Dir = [System.IO.Path]::GetDirectoryName($Path)
  if (![string]::IsNullOrWhiteSpace($Dir) -and ![System.IO.Directory]::Exists($Dir)) {
    [System.IO.Directory]::CreateDirectory($Dir) | Out-Null
  }

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Backup-File {
  param([string] $Path, [string] $Tag)

  if (!(Test-Path -LiteralPath $Path)) {
    throw "Arquivo nao encontrado: $Path"
  }

  $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $BackupPath = "$Path.bak-$Tag-$Stamp"
  Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
  Write-Host "[OK] Backup criado: $BackupPath"
}

function Replace-MethodByName {
  param(
    [string] $Text,
    [string] $MethodName,
    [string] $NewMethod
  )

  $Match = [System.Text.RegularExpressions.Regex]::Match($Text, "private\s+$MethodName\s*\(")

  if (!$Match.Success) {
    throw "Nao encontrei o metodo private $MethodName(...)"
  }

  $Start = $Match.Index
  $OpenBrace = $Text.IndexOf("{", $Match.Index)

  if ($OpenBrace -lt 0) {
    throw "Nao encontrei chave de abertura do metodo $MethodName."
  }

  $Depth = 0
  $End = -1

  for ($i = $OpenBrace; $i -lt $Text.Length; $i++) {
    $ch = $Text[$i]

    if ($ch -eq "{") {
      $Depth++
    } elseif ($ch -eq "}") {
      $Depth--

      if ($Depth -eq 0) {
        $End = $i + 1
        break
      }
    }
  }

  if ($End -lt 0) {
    throw "Nao encontrei fim do metodo $MethodName."
  }

  return $Text.Substring(0, $Start) + $NewMethod + $Text.Substring($End)
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Ajustando regra correta: cancelamento vira wallet 80%, saque envia 60% original ao banco"

# 1) Cancelamento nao deve ter REFUND_60 direto.
foreach ($dtoPath in @($CancelOrderDtoPath, $CancelTicketDtoPath)) {
  Backup-File -Path $dtoPath -Tag "wallet-withdraw-rule"
  $dto = [System.IO.File]::ReadAllText($dtoPath)
  $dto = $dto.Replace("@IsIn(['REFUND_60', 'WALLET_80'])", "@IsIn(['WALLET_80'])")
  $dto = $dto.Replace("@IsIn(['REFUND_70', 'WALLET_80'])", "@IsIn(['WALLET_80'])")
  Write-Utf8NoBom -Path $dtoPath -Content $dto
  Write-Host "[OK] DTO ajustado para aceitar apenas WALLET_80: $dtoPath"
}

# 2) OrdersService: getCancellationConfig deve bloquear modo direto de banco e manter wallet 80%.
Backup-File -Path $OrdersServicePath -Tag "wallet-withdraw-rule"

$ordersService = [System.IO.File]::ReadAllText($OrdersServicePath)

$newCancellationConfig = @'
  private getCancellationConfig(mode?: string) {
    const normalizedMode = String(mode || 'WALLET_80').toUpperCase();

    if (normalizedMode !== 'WALLET_80') {
      throw new BadRequestException(
        'Cancelamento devolve 80% na wallet. Para enviar ao banco, solicite saque da wallet.',
      );
    }

    return {
      mode: 'WALLET_80',
      percent: new Prisma.Decimal(0.8),
      cancellationStatus: 'WALLET_CREDITED',
      createWalletCredit: true,
    };
  }

'@

$ordersService = Replace-MethodByName -Text $ordersService -MethodName "getCancellationConfig" -NewMethod $newCancellationConfig
$ordersService = $ordersService.Replace(
  "description: `Credito de 80% por estorno do QR ${ticket.id}`,",
  "description: `Credito de 80% na wallet pelo cancelamento do QR ${ticket.id}`,"
)
$ordersService = $ordersService.Replace(
  "description: `Credito de 80% na wallet pelo cancelamento do QR ${ticket.id}`,",
  "description: `Credito de 80% na wallet pelo cancelamento do QR ${ticket.id}`,"
)

Write-Utf8NoBom -Path $OrdersServicePath -Content $ordersService
Write-Host "[OK] OrdersService ajustado: cancelamento sempre WALLET_80."

# 3) UsersController: endpoint de saque da wallet para banco.
Backup-File -Path $UsersControllerPath -Tag "wallet-withdraw-rule"

$usersController = [System.IO.File]::ReadAllText($UsersControllerPath)

if ($usersController -notmatch "withdraw-bank") {
  $walletMethod = @'
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post('me/wallet/withdraw-bank')
  requestWalletBankWithdrawal(
    @Req() req: AuthenticatedRequest,
    @Body() body: { amount?: string | number; bankPixKey?: string; bankAccountLabel?: string },
  ) {
    return this.usersService.requestWalletBankWithdrawal(req.user.sub, body);
  }

'@

  $usersController = $usersController.Replace(
    "  @ApiBearerAuth('bearer')" + "`r`n" +
    "  @UseGuards(JwtAuthGuard, RolesGuard)" + "`r`n" +
    "  @Get()" + "`r`n",
    $walletMethod +
    "  @ApiBearerAuth('bearer')" + "`r`n" +
    "  @UseGuards(JwtAuthGuard, RolesGuard)" + "`r`n" +
    "  @Get()" + "`r`n"
  )

  if ($usersController -notmatch "withdraw-bank") {
    throw "Nao consegui inserir endpoint withdraw-bank em users.controller.ts"
  }

  Write-Host "[OK] Endpoint POST /users/me/wallet/withdraw-bank inserido."
} else {
  Write-Host "[OK] Endpoint withdraw-bank ja existia."
}

Write-Utf8NoBom -Path $UsersControllerPath -Content $usersController

# 4) UsersService: logica de saque.
Backup-File -Path $UsersServicePath -Tag "wallet-withdraw-rule"

$usersService = [System.IO.File]::ReadAllText($UsersServicePath)

if ($usersService -notmatch "BadRequestException") {
  $usersService = $usersService.Replace(
    "import {" + "`r`n" + "  ConflictException,",
    "import {" + "`r`n" + "  BadRequestException," + "`r`n" + "  ConflictException,"
  )
}

if ($usersService -notmatch "from 'crypto'") {
  $usersService = $usersService.Replace(
    "import { Prisma } from '@prisma/client';" + "`r`n",
    "import { Prisma } from '@prisma/client';" + "`r`n" + "import * as crypto from 'crypto';" + "`r`n"
  )
}

if ($usersService -notmatch "requestWalletBankWithdrawal") {
  $withdrawMethods = @'

  private calculateWalletBalanceFromTransactions(
    transactions: Array<{ type: string; amount: Prisma.Decimal }>,
  ) {
    let balance = new Prisma.Decimal(0);

    for (const transaction of transactions) {
      if (transaction.type === 'DEBIT') {
        balance = balance.sub(transaction.amount);
      } else {
        balance = balance.add(transaction.amount);
      }
    }

    return balance;
  }

  async requestWalletBankWithdrawal(
    userId: string,
    body?: { amount?: string | number; bankPixKey?: string; bankAccountLabel?: string },
  ) {
    let grossAmount: Prisma.Decimal;

    try {
      grossAmount = new Prisma.Decimal(
        String(body?.amount ?? '0').replace(',', '.'),
      );
    } catch {
      throw new BadRequestException('Valor de saque invalido');
    }

    if (grossAmount.lte(0)) {
      throw new BadRequestException('Valor de saque deve ser maior que zero');
    }

    const withdrawalId = crypto.randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
        },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      const transactions = await tx.walletTransaction.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const balanceBefore = this.calculateWalletBalanceFromTransactions(transactions);

      if (grossAmount.gt(balanceBefore)) {
        throw new BadRequestException('Saldo insuficiente na wallet para este saque');
      }

      // Regra de negocio:
      // Cancelamento devolve 80% do ingresso para a wallet.
      // Ao sacar para banco, retem mais 20% do valor original.
      // Como a wallet ja representa 80% do original, o banco recebe 75% do saldo sacado.
      // Exemplo: ingresso 80 -> wallet 64 -> banco 48 -> taxa 16.
      const feeAmount = grossAmount.mul(new Prisma.Decimal(0.25));
      const bankAmount = grossAmount.sub(feeAmount);
      const balanceAfter = balanceBefore.sub(grossAmount);
      const destination = String(
        body?.bankPixKey || body?.bankAccountLabel || 'nao informado',
      ).trim();

      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          type: 'DEBIT',
          source: 'WALLET_BANK_WITHDRAWAL',
          sourceId: withdrawalId,
          amount: grossAmount,
          description:
            `Saque da wallet para banco solicitado. ` +
            `Valor debitado da wallet: ${grossAmount.toFixed(2)}. ` +
            `Taxa de retirada: ${feeAmount.toFixed(2)}. ` +
            `Valor enviado ao banco: ${bankAmount.toFixed(2)}. ` +
            `Destino: ${destination}.`,
        },
      });

      return {
        id: withdrawalId,
        status: 'REQUESTED',
        user,
        grossAmount,
        feeAmount,
        bankAmount,
        balanceBefore,
        balanceAfter,
        walletDebitPercent: '100%',
        bankPercentOfWallet: '75%',
        feePercentOfWallet: '25%',
        businessRule:
          'Cancelamento credita 80% na wallet; saque envia 75% desse credito ao banco, equivalente a 60% do valor original.',
        transaction,
      };
    });
  }

'@

  $lastBrace = $usersService.LastIndexOf("}")
  if ($lastBrace -lt 0) {
    throw "Nao encontrei fim da classe UsersService."
  }

  $usersService = $usersService.Substring(0, $lastBrace) + $withdrawMethods + "`r`n" + $usersService.Substring($lastBrace)
  Write-Host "[OK] Logica de saque da wallet inserida em UsersService."
} else {
  Write-Host "[OK] Logica de saque ja existia em UsersService."
}

Write-Utf8NoBom -Path $UsersServicePath -Content $usersService

# 5) Runner Node com a nova regra.
$nodeRunner = @'
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
const reportPath = path.join(reportsDir, `cancellation-wallet-withdraw-report-${stamp}.txt`);

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
  const cpf = `93${random}`;
  const email = `cw-${safeKind}-${safeStamp}-${random}@astroingressos.com.br`;
  const password = "Teste1234!";
  const name = `Cliente Cancel Wallet ${kind} ${random}`;

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
      Number(item?.quantity || 0) >= 5 &&
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
    name: `Ingresso teste wallet saque ${stamp}`,
    lotLabel: "Lote teste wallet saque",
    description: "Criado automaticamente para teste wallet + saque",
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
  const customerName = customer.user?.name || "Cliente Cancel Wallet";
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

function getWalletTx(wallet, source, sourceId) {
  return asArray(wallet?.transactions).find((tx) =>
    String(tx?.source) === String(source) &&
    (sourceId ? String(tx?.sourceId) === String(sourceId) : true),
  ) || null;
}

function getCancellationForTicket(order, ticketId) {
  return asArray(order?.cancellations).find((cancel) => String(cancel?.ticketId) === String(ticketId)) || null;
}

function assertWalletCredit(wallet, ticketId, expectedAmount) {
  const tx = getWalletTx(wallet, "TICKET_CANCELLATION", ticketId);
  assertTrue(Boolean(tx), `Wallet recebeu credito para ticket ${ticketId}`);
  if (!tx) return;

  assertTrue(String(tx.type) === "CREDIT", "Transacao da wallet e CREDIT");
  assertTrue(money(tx.amount) === money(expectedAmount), `Credito da wallet bate com esperado: ${money(expectedAmount)}`);
}

async function main() {
  log("[INFO] Teste de cancelamento -> wallet 80% -> saque banco 60% original");
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
    log("[FLUXO 1] Cancelamento cai 80% na wallet e saque envia 60% original ao banco");
    log("============================================================");

    const walletCustomer = await createTestCustomer("wallet-saque");
    const walletCreated = await createPaidOrderWithTickets(walletCustomer, ticketType, 1, "PIX_TESTE_WALLET_SAQUE");
    const walletOrder = walletCreated.order;
    const walletTicket = walletCreated.tickets[0];
    const unitPrice = getTicketUnitPrice(walletOrder, walletTicket.id);
    const walletExpected = money(unitPrice * 0.8);
    const bankExpected = money(unitPrice * 0.6);
    const feeExpected = money(walletExpected - bankExpected);

    log(`[INFO] Valor ingresso=${unitPrice}, wallet80=${walletExpected}, banco60=${bankExpected}, taxa=${feeExpected}`);

    const canceled = await api("PATCH", `/orders/customer/${walletOrder.id}/cancel`, {
      mode: "WALLET_80",
    }, walletCustomer.token);

    assertTrue(String(canceled.status) === "CANCELED", "Pedido ficou CANCELED");
    const canceledTicket = firstTicket(canceled);
    assertTrue(String(canceledTicket?.status) === "CANCELED", "Ticket ficou CANCELED");

    const cancellation = getCancellationForTicket(canceled, walletTicket.id);
    assertTrue(Boolean(cancellation), "Cancelamento gerou registro");
    if (cancellation) {
      assertTrue(String(cancellation.mode) === "WALLET_80", "Cancelamento tem mode WALLET_80");
      assertTrue(money(cancellation.originalAmount) === unitPrice, "Cancelamento guardou valor original");
      assertTrue(money(cancellation.returnedAmount) === walletExpected, "Cancelamento retornou 80% para wallet");
    }

    const walletBeforeWithdraw = await api("GET", "/users/me/wallet", null, walletCustomer.token);
    assertWalletCredit(walletBeforeWithdraw, walletTicket.id, walletExpected);
    assertTrue(money(walletBeforeWithdraw.balance) >= walletExpected, "Saldo da wallet recebeu credito de 80%");

    const withdrawal = await api("POST", "/users/me/wallet/withdraw-bank", {
      amount: walletExpected,
      bankPixKey: "teste-saque@astroingressos.com.br",
    }, walletCustomer.token);

    assertTrue(String(withdrawal.status) === "REQUESTED", "Saque para banco ficou REQUESTED");
    assertTrue(money(withdrawal.grossAmount) === walletExpected, "Saque debitou 100% do credito da wallet");
    assertTrue(money(withdrawal.feeAmount) === feeExpected, "Taxa do saque equivale a mais 20% do original");
    assertTrue(money(withdrawal.bankAmount) === bankExpected, "Banco recebe 60% do valor original do ingresso");
    assertTrue(String(withdrawal.transaction?.type) === "DEBIT", "Saque criou transacao DEBIT");
    assertTrue(String(withdrawal.transaction?.source) === "WALLET_BANK_WITHDRAWAL", "Saque criou source WALLET_BANK_WITHDRAWAL");

    const walletAfterWithdraw = await api("GET", "/users/me/wallet", null, walletCustomer.token);
    const withdrawTx = getWalletTx(walletAfterWithdraw, "WALLET_BANK_WITHDRAWAL", withdrawal.id);
    assertTrue(Boolean(withdrawTx), "Historico da wallet mostra o saque para banco");
    assertTrue(money(walletAfterWithdraw.balance) === money(walletBeforeWithdraw.balance - walletExpected), "Saldo da wallet foi debitado pelo valor sacado");

    const secondWithdraw = await apiExpectError("POST", "/users/me/wallet/withdraw-bank", {
      amount: walletExpected,
      bankPixKey: "teste-saque-duplicado@astroingressos.com.br",
    }, walletCustomer.token);

    assertTrue(!secondWithdraw.ok, "Nao permite sacar mais do que o saldo disponivel");

    const qrAfterCancel = await apiExpectError("GET", `/tickets/customer/${walletTicket.id}/qr-token`, null, walletCustomer.token);
    assertTrue(!qrAfterCancel.ok, "QR bloqueado apos cancelamento");

    log("");
    log("============================================================");
    log("[FLUXO 2] REFUND_60 direto no cancelamento deve ser bloqueado");
    log("============================================================");

    const refundCustomer = await createTestCustomer("refund-direto");
    const refundCreated = await createPaidOrderWithTickets(refundCustomer, ticketType, 1, "PIX_TESTE_REFUND_DIRETO");
    const refundOrder = refundCreated.order;

    const directRefund = await apiExpectError("PATCH", `/orders/customer/${refundOrder.id}/cancel`, {
      mode: "REFUND_60",
    }, refundCustomer.token);

    assertTrue(!directRefund.ok, "Cancelamento direto REFUND_60 foi bloqueado");

    const refundCleanup = await api("PATCH", `/orders/customer/${refundOrder.id}/cancel`, {
      mode: "WALLET_80",
    }, refundCustomer.token);
    assertTrue(String(refundCleanup.status) === "CANCELED", "Pedido do teste REFUND_60 foi cancelado corretamente via WALLET_80");

    log("");
    log("============================================================");
    log("[FLUXO 3] Cancelamento parcial mantem QR do ticket nao cancelado");
    log("============================================================");

    const partialCustomer = await createTestCustomer("parcial");
    const partialCreated = await createPaidOrderWithTickets(partialCustomer, ticketType, 2, "PIX_TESTE_CANCELAMENTO_PARCIAL");
    const partialOrder = partialCreated.order;
    const partialCancel = partialCreated.tickets[0];
    const partialKeep = partialCreated.tickets[1];
    const partialUnit = getTicketUnitPrice(partialOrder, partialCancel.id);
    const partialWalletExpected = money(partialUnit * 0.8);

    const partialCancelled = await api("PATCH", `/orders/customer/tickets/${partialCancel.id}/cancel`, {
      mode: "WALLET_80",
    }, partialCustomer.token);

    assertTrue(String(partialCancelled.status) === "PAID", "Pedido parcial continua PAID");
    const partialTickets = getTickets(partialCancelled);
    assertTrue(partialTickets.filter((ticket) => String(ticket.status) === "CANCELED").length === 1, "Pedido parcial tem 1 ticket CANCELED");
    assertTrue(partialTickets.filter((ticket) => String(ticket.status) === "AVAILABLE").length === 1, "Pedido parcial manteve 1 ticket AVAILABLE");

    const partialWallet = await api("GET", "/users/me/wallet", null, partialCustomer.token);
    assertWalletCredit(partialWallet, partialCancel.id, partialWalletExpected);

    const partialQrCanceled = await apiExpectError("GET", `/tickets/customer/${partialCancel.id}/qr-token`, null, partialCustomer.token);
    assertTrue(!partialQrCanceled.ok, "QR do ticket cancelado parcial foi bloqueado");

    const partialQrKept = await api("GET", `/tickets/customer/${partialKeep.id}/qr-token`, null, partialCustomer.token);
    assertTrue(Boolean(partialQrKept?.token), "QR do ticket mantido continua gerando");

    log("");
    log("============================================================");
    log("[FLUXO 4] Ticket usado nao pode cancelar");
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

    const transferCustomer = await createTestCustomer("transfer-rem");
    const transferRecipient = await createTestCustomer("transfer-dest");
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
    log("[INFO] Fluxo completo concluido:");
    log(`Cancelamento wallet: order=${walletOrder.id}, ticket=${walletTicket.id}, wallet=${walletExpected}, banco=${bankExpected}, taxa=${feeExpected}`);
    log(`Bloqueio REFUND_60 direto: order=${refundOrder.id}`);
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
'@

$psRunner = @'
param(
  [string] $BaseUrl = "http://localhost:3001/v1",
  [string] $EventId = "cb3d0e43-5866-4d0c-b892-860f8d53d02d",
  [string] $EventName = "Infantil Seed 487",
  [string] $TicketTypeId = "",
  [string] $AdminCpf = "11111111111",
  [string] $AdminPassword = "123456"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$JsPath = Join-Path $ProjectRoot "run-cancellation-wallet-withdraw-real-api-tests.js"

if (!(Test-Path -LiteralPath $JsPath)) {
  throw "Nao encontrei o runner Node: $JsPath"
}

$argsList = @(
  $JsPath,
  "--baseUrl", $BaseUrl,
  "--eventId", $EventId,
  "--eventName", $EventName,
  "--adminCpf", $AdminCpf,
  "--adminPassword", $AdminPassword
)

if (![string]::IsNullOrWhiteSpace($TicketTypeId)) {
  $argsList += @("--ticketTypeId", $TicketTypeId)
}

node @argsList

if ($LASTEXITCODE -ne 0) {
  throw "Teste Node de cancelamento wallet/saque terminou com erro."
}
'@

Write-Utf8NoBom -Path $JsRunnerPath -Content $nodeRunner
Write-Utf8NoBom -Path $PsRunnerPath -Content $psRunner
Write-Host "[OK] Runner Node criado: $JsRunnerPath"
Write-Host "[OK] Wrapper PowerShell criado: $PsRunnerPath"

# 6) Build API.
Set-Location $ApiRoot
Write-Host "[INFO] Rodando build da API..."
npm run build *> log-api-wallet-withdraw-rule-build.txt

$BuildLogPath = Join-Path $ApiRoot "log-api-wallet-withdraw-rule-build.txt"
$Errors = Select-String -Path $BuildLogPath -Pattern "error|Error:|Failed|Cannot find|Type error|Module not found|withdraw|wallet|WALLET_80|REFUND_60|Prisma" -Context 2,3

if ($Errors) {
  Write-Host "[AVISO] Build gerou linhas filtradas. Veja abaixo:" -ForegroundColor Yellow
  $Errors | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "[OK] Build sem erros filtrados."
}

Write-Host ""
Write-Host "[OK] Regra wallet + saque preparada."
Write-Host ""
Write-Host "Agora reinicie a API e rode:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-cancellation-wallet-withdraw-real-api-tests.ps1"

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiRoot = Join-Path $ProjectRoot "apps\api"
$OrderDtoPath = Join-Path $ApiRoot "src\orders\dto\cancel-order.dto.ts"
$TicketDtoPath = Join-Path $ApiRoot "src\orders\dto\cancel-ticket.dto.ts"
$OrdersServicePath = Join-Path $ApiRoot "src\orders\orders.service.ts"
$RunnerPath = Join-Path $ProjectRoot "run-cancellation-deep-real-api-tests.ps1"

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
  param([string] $Path)

  if (!(Test-Path -LiteralPath $Path)) {
    throw "Arquivo nao encontrado: $Path"
  }

  $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $BackupPath = "$Path.bak-cancel-deep-$Stamp"
  Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
  Write-Host "[OK] Backup criado: $BackupPath"
}

function Replace-InFile {
  param(
    [string] $Path,
    [scriptblock] $Updater
  )

  Backup-File $Path
  $Text = [System.IO.File]::ReadAllText($Path)
  $NewText = & $Updater $Text

  if ($null -eq $NewText) {
    throw "Updater retornou nulo para $Path"
  }

  if ($NewText -eq $Text) {
    Write-Host "[AVISO] Nenhuma mudanca aplicada em: $Path" -ForegroundColor Yellow
  } else {
    Write-Utf8NoBom -Path $Path -Content $NewText
    Write-Host "[OK] Atualizado: $Path"
  }
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Ajustando cancelamento aprofundado: WALLET_80 e REFUND_60"

# 1) DTOs: banco agora e REFUND_60, wallet continua WALLET_80.
Replace-InFile -Path $OrderDtoPath -Updater {
  param($Text)
  $Text = $Text.Replace("'REFUND_70', 'WALLET_80'", "'REFUND_60', 'WALLET_80'")
  $Text = $Text.Replace('"REFUND_70", "WALLET_80"', '"REFUND_60", "WALLET_80"')
  return $Text
}

Replace-InFile -Path $TicketDtoPath -Updater {
  param($Text)
  $Text = $Text.Replace("'REFUND_70', 'WALLET_80'", "'REFUND_60', 'WALLET_80'")
  $Text = $Text.Replace('"REFUND_70", "WALLET_80"', '"REFUND_60", "WALLET_80"')
  return $Text
}

# 2) Service: troca modo REFUND_70 para REFUND_60 e percentuais de 70 para 60.
Replace-InFile -Path $OrdersServicePath -Updater {
  param($Text)

  $Text = $Text.Replace("'REFUND_70'", "'REFUND_60'")
  $Text = $Text.Replace('"REFUND_70"', '"REFUND_60"')
  $Text = $Text.Replace("REFUND_70", "REFUND_60")

  # Tenta deixar o bloco getCancellationConfig com 60%.
  $Text = [System.Text.RegularExpressions.Regex]::Replace(
    $Text,
    '(?s)(getCancellationConfig[\s\S]*?REFUND_60[\s\S]*?)(new Prisma\.Decimal\()0\.7(\))',
    '${1}${2}0.6${3}'
  )

  $Text = [System.Text.RegularExpressions.Regex]::Replace(
    $Text,
    '(?s)(getCancellationConfig[\s\S]*?REFUND_60[\s\S]*?percent\s*:\s*)0\.7',
    '${1}0.6'
  )

  $Text = [System.Text.RegularExpressions.Regex]::Replace(
    $Text,
    '(?s)(getCancellationConfig[\s\S]*?REFUND_60[\s\S]*?)70%',
    '${1}60%'
  )

  $Text = $Text.Replace("70% por estorno", "60% por estorno")
  $Text = $Text.Replace("Estorno de 70%", "Estorno de 60%")
  $Text = $Text.Replace("REFUND_60 de 70%", "REFUND_60 de 60%")

  return $Text
}

# 3) Cria runner profundo.
$Runner = @'
param(
  [string] $BaseUrl = "http://localhost:3001/v1",
  [string] $EventId = "cb3d0e43-5866-4d0c-b892-860f8d53d02d",
  [string] $EventName = "Infantil Seed 487",
  [string] $TicketTypeId = ""
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReportsDir = Join-Path $ProjectRoot "apps\web\test-results\reports"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $ReportsDir "cancellation-deep-real-api-report-$Stamp.txt"

New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null

$BaseUrl = $BaseUrl.TrimEnd("/")
$Passed = 0
$Failed = 0
$Warnings = 0

function Log {
  param([string] $Message)
  Write-Host $Message
  Add-Content -Path $ReportPath -Value $Message
}

function Pass {
  param([string] $Message)
  $script:Passed++
  Log "[OK] $Message"
}

function Warn {
  param([string] $Message)
  $script:Warnings++
  Log "[AVISO] $Message"
}

function Fail {
  param([string] $Message)
  $script:Failed++
  Log "[FALHA] $Message"
}

function Assert-True {
  param(
    [bool] $Condition,
    [string] $Message
  )

  if ($Condition) {
    Pass $Message
  } else {
    Fail $Message
  }
}

function Invoke-Api {
  param(
    [string] $Method,
    [string] $Path,
    [object] $Body = $null,
    [string] $Token = ""
  )

  $headers = @{
    "Content-Type" = "application/json"
  }

  if (![string]::IsNullOrWhiteSpace($Token)) {
    $headers["Authorization"] = "Bearer $Token"
  }

  $uri = "$BaseUrl$Path"

  try {
    if ($null -eq $Body) {
      return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
    }

    $json = $Body | ConvertTo-Json -Depth 40
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $json
  } catch {
    $detail = $_.Exception.Message

    try {
      if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
        $detail = $_.ErrorDetails.Message
      }
    } catch {}

    throw "Erro em $Method $Path : $detail"
  }
}

function Invoke-Api-ExpectError {
  param(
    [string] $Method,
    [string] $Path,
    [object] $Body = $null,
    [string] $Token = ""
  )

  try {
    $result = Invoke-Api -Method $Method -Path $Path -Body $Body -Token $Token
    return @{
      ok = $true
      result = $result
      error = $null
    }
  } catch {
    return @{
      ok = $false
      result = $null
      error = $_.Exception.Message
    }
  }
}

function Login {
  param(
    [string] $RoleLabel,
    [string] $Cpf,
    [string] $Password
  )

  $data = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    cpf = $Cpf
    password = $Password
  }

  if (!$data.accessToken) {
    throw "Login de $RoleLabel nao retornou accessToken."
  }

  Pass "Login $RoleLabel realizado: $($data.user.email) / $($data.user.role)"

  return @{
    token = $data.accessToken
    user = $data.user
    cpf = $Cpf
    password = $Password
  }
}

function Create-TestCustomer {
  param([string] $Kind)

  $random = Get-Random -Minimum 100000000 -Maximum 999999999
  $cpf = "95$random"
  $email = "cancel-deep-$Kind-$Stamp-$random@astroingressos.local"
  $password = "Teste1234!"
  $name = "Cliente Cancel Deep $Kind $random"

  $user = Invoke-Api -Method "POST" -Path "/users" -Body @{
    name = $name
    email = $email
    cpf = $cpf
    password = $password
    role = "CUSTOMER"
  }

  Assert-True ([bool]$user.id) "Usuario $Kind criado: $($user.email) / CPF $cpf"

  return Login -RoleLabel "CUSTOMER $Kind" -Cpf $cpf -Password $password
}

function To-Array {
  param($Value)

  if ($null -eq $Value) {
    return @()
  }

  return @($Value)
}

function To-DecimalNumber {
  param($Value)

  if ($null -eq $Value) {
    return [decimal]0
  }

  return [decimal]([string]$Value)
}

function Count-Items {
  param([object] $Order)

  if ($null -eq $Order -or $null -eq $Order.items) {
    return 0
  }

  return @($Order.items).Count
}

function Count-Tickets {
  param([object] $Order)

  $count = 0

  if ($null -eq $Order -or $null -eq $Order.items) {
    return 0
  }

  foreach ($item in @($Order.items)) {
    if ($null -eq $item -or $null -eq $item.tickets) {
      continue
    }

    $count += @($item.tickets).Count
  }

  return $count
}

function Get-FirstTicket {
  param([object] $Order)

  if ($null -eq $Order -or $null -eq $Order.items) {
    return $null
  }

  foreach ($item in @($Order.items)) {
    if ($null -eq $item -or $null -eq $item.tickets) {
      continue
    }

    foreach ($ticket in @($item.tickets)) {
      if ($ticket) {
        return $ticket
      }
    }
  }

  return $null
}

function Get-Tickets {
  param([object] $Order)

  $result = New-Object System.Collections.Generic.List[object]

  if ($null -eq $Order -or $null -eq $Order.items) {
    return @()
  }

  foreach ($item in @($Order.items)) {
    if ($null -eq $item -or $null -eq $item.tickets) {
      continue
    }

    foreach ($ticket in @($item.tickets)) {
      if ($ticket) {
        $result.Add($ticket)
      }
    }
  }

  return @($result)
}

function Get-TicketUnitPrice {
  param(
    [object] $Order,
    [string] $TicketId
  )

  if ($null -eq $Order -or $null -eq $Order.items) {
    return [decimal]0
  }

  foreach ($item in @($Order.items)) {
    if ($null -eq $item) {
      continue
    }

    foreach ($ticket in @($item.tickets)) {
      if ([string]$ticket.id -eq [string]$TicketId) {
        $unit = To-DecimalNumber $item.unitPrice

        if ($unit -gt 0) {
          return $unit
        }

        $total = To-DecimalNumber $item.totalPrice
        $quantity = [decimal]$item.quantity

        if ($total -gt 0 -and $quantity -gt 0) {
          return [decimal]::Round(($total / $quantity), 2)
        }
      }
    }
  }

  $orderTotal = To-DecimalNumber $Order.totalAmount
  $ticketCount = Count-Tickets $Order

  if ($orderTotal -gt 0 -and $ticketCount -gt 0) {
    return [decimal]::Round(($orderTotal / [decimal]$ticketCount), 2)
  }

  return [decimal]0
}

function Resolve-OrderResponse {
  param([object] $Response)

  if ($null -eq $Response) {
    return $null
  }

  if ($Response.order) {
    return $Response.order
  }

  return $Response
}

function Find-Or-CreateTicketType {
  param([string] $EventId)

  if (![string]::IsNullOrWhiteSpace($TicketTypeId)) {
    $ticketType = Invoke-Api -Method "GET" -Path "/ticket-types/$TicketTypeId"
    Pass "Tipo de ingresso informado carregado: $($ticketType.name) / $($ticketType.id)"
    return $ticketType
  }

  $allTypes = To-Array (Invoke-Api -Method "GET" -Path "/ticket-types")
  $eventTypes = @(
    $allTypes |
      Where-Object {
        [string]$_.eventId -eq [string]$EventId -and
        [int]($_.quantity) -ge 3 -and
        [string]$_.status -eq "ACTIVE"
      } |
      Sort-Object @{ Expression = { if ($null -ne $_.displayOrder) { [int]$_.displayOrder } else { 9999 } } }, @{ Expression = { $_.createdAt } }
  )

  if ($eventTypes.Count -gt 0) {
    $selected = $eventTypes | Select-Object -First 1
    Pass "Tipo de ingresso existente escolhido: $($selected.name) / $($selected.id) / qtd=$($selected.quantity)"
    return $selected
  }

  Warn "Nenhum tipo de ingresso com estoque suficiente encontrado. Vou criar lote de teste para cancelamento aprofundado."

  $newType = Invoke-Api -Method "POST" -Path "/ticket-types" -Body @{
    eventId = $EventId
    name = "Ingresso teste cancelamento profundo $Stamp"
    lotLabel = "Lote teste cancelamento profundo"
    description = "Criado automaticamente para teste aprofundado de cancelamento"
    price = "100.00"
    quantity = 50
    minPerOrder = 1
    maxPerOrder = 10
    displayOrder = 999
    feeAmount = "0.00"
    feeDescription = "Sem taxa no teste"
    isHidden = $false
    status = "ACTIVE"
  }

  Pass "Tipo de ingresso de teste criado: $($newType.name) / $($newType.id)"

  return $newType
}

function Create-PaidOrderWithTickets {
  param(
    [hashtable] $Customer,
    [object] $TicketType,
    [int] $Quantity,
    [string] $PaymentMethod
  )

  $customerName = $Customer.user.name
  if ([string]::IsNullOrWhiteSpace($customerName)) {
    $customerName = "Cliente Cancel Deep"
  }

  $customerEmail = $Customer.user.email
  if ([string]::IsNullOrWhiteSpace($customerEmail)) {
    throw "Usuario customer nao tem email."
  }

  $customerCpf = [string]$Customer.user.cpf
  if ([string]::IsNullOrWhiteSpace($customerCpf)) {
    $customerCpf = [string]$Customer.cpf
  }
  $customerCpf = $customerCpf -replace '\D', ''

  $holders = @()
  for ($i = 1; $i -le $Quantity; $i++) {
    $holders += @{
      name = "$customerName Ticket $i"
      email = $customerEmail
      cpf = $customerCpf
    }
  }

  $orderBody = @{
    eventId = $EventId
    customerName = $customerName
    customerEmail = $customerEmail
    customerCpf = $customerCpf
    items = @(
      @{
        ticketTypeId = $TicketType.id
        quantity = $Quantity
        holders = $holders
      }
    )
    useWalletBalance = $false
  }

  $beforeType = Invoke-Api -Method "GET" -Path "/ticket-types/$($TicketType.id)"

  $orderResponse = Invoke-Api -Method "POST" -Path "/orders/customer" -Token $Customer.token -Body $orderBody
  $order = Resolve-OrderResponse -Response $orderResponse

  Assert-True ([bool]$order.id) "Pedido criado com $Quantity ticket(s): $($order.id)"
  Assert-True ((Count-Items $order) -gt 0) "Pedido criado com item"
  Assert-True ((Count-Tickets $order) -eq $Quantity) "Pedido criou $Quantity ticket(s)"

  $afterCreateType = Invoke-Api -Method "GET" -Path "/ticket-types/$($TicketType.id)"
  Assert-True ([int]$afterCreateType.quantity -eq ([int]$beforeType.quantity - $Quantity)) "Estoque decrementou $Quantity apos criar pedido"

  $payment = Invoke-Api -Method "POST" -Path "/payments/customer/$($order.id)/finalize" -Token $Customer.token -Body @{
    method = $PaymentMethod
  }

  Assert-True ([bool]$payment.id) "Pagamento finalizado: $($payment.id)"

  $paidOrder = Invoke-Api -Method "GET" -Path "/orders/customer/$($order.id)" -Token $Customer.token
  $tickets = Get-Tickets -Order $paidOrder

  Assert-True ([string]$paidOrder.status -eq "PAID") "Pedido ficou PAID"
  Assert-True ($tickets.Count -eq $Quantity) "Pedido pago tem $Quantity ticket(s)"
  Assert-True (($tickets | Where-Object { [string]$_.status -eq "AVAILABLE" }).Count -eq $Quantity) "Todos os tickets estao AVAILABLE"

  return @{
    order = $paidOrder
    tickets = $tickets
    beforeType = $beforeType
    afterCreateType = $afterCreateType
  }
}

function Get-WalletCreditForTicket {
  param(
    [object] $Wallet,
    [string] $TicketId
  )

  foreach ($tx in @($Wallet.transactions)) {
    if ([string]$tx.source -eq "TICKET_CANCELLATION" -and [string]$tx.sourceId -eq [string]$TicketId) {
      return $tx
    }
  }

  return $null
}

function Get-CancellationForTicket {
  param(
    [object] $Order,
    [string] $TicketId
  )

  foreach ($cancel in @($Order.cancellations)) {
    if ([string]$cancel.ticketId -eq [string]$TicketId) {
      return $cancel
    }
  }

  return $null
}

function Assert-WalletCredit {
  param(
    [object] $Wallet,
    [string] $TicketId,
    [decimal] $ExpectedAmount
  )

  $creditTx = Get-WalletCreditForTicket -Wallet $Wallet -TicketId $TicketId

  Assert-True ([bool]$creditTx) "Wallet recebeu credito para ticket $TicketId"

  if ($creditTx) {
    Assert-True ([string]$creditTx.type -eq "CREDIT") "Transacao da wallet e CREDIT"
    Assert-True ([string]$creditTx.source -eq "TICKET_CANCELLATION") "Transacao da wallet tem source TICKET_CANCELLATION"

    $creditAmount = To-DecimalNumber $creditTx.amount
    Assert-True ($creditAmount -eq $ExpectedAmount) "Credito da wallet bate com esperado: $ExpectedAmount"
  }
}

function Assert-NoWalletCredit {
  param(
    [object] $Wallet,
    [string] $TicketId
  )

  $creditTx = Get-WalletCreditForTicket -Wallet $Wallet -TicketId $TicketId
  Assert-True (-not [bool]$creditTx) "Nao houve credito de wallet para ticket $TicketId"
}

Log "[INFO] Teste APROFUNDADO de cancelamento, wallet 80%, estorno banco 60%, parcial, usado e transferencia pendente"
Log "[INFO] BaseUrl: $BaseUrl"
Log "[INFO] Evento: $EventName / $EventId"
Log "[INFO] Relatorio: $ReportPath"
Log ""

try {
  try {
    Invoke-RestMethod -Method GET -Uri "$BaseUrl" -TimeoutSec 4 | Out-Null
    Pass "API respondeu em $BaseUrl"
  } catch {
    Warn "Nao consegui validar GET $BaseUrl. Vou tentar os endpoints mesmo assim."
  }

  $ticketType = Find-Or-CreateTicketType -EventId $EventId
  $adminLogin = Login -RoleLabel "ADMIN validador" -Cpf "11111111111" -Password "123456"

  Log ""
  Log "============================================================"
  Log "[FLUXO 1] Cancelamento total com WALLET_80"
  Log "============================================================"

  $walletCustomer = Create-TestCustomer -Kind "wallet80"
  $walletCreated = Create-PaidOrderWithTickets -Customer $walletCustomer -TicketType $ticketType -Quantity 1 -PaymentMethod "PIX_TESTE_WALLET80"
  $walletOrder = $walletCreated.order
  $walletTicket = $walletCreated.tickets[0]
  $walletUnitPrice = Get-TicketUnitPrice -Order $walletOrder -TicketId $walletTicket.id
  $walletExpected = [decimal]::Round(($walletUnitPrice * [decimal]0.80), 2)

  $walletCanceled = Invoke-Api -Method "PATCH" -Path "/orders/customer/$($walletOrder.id)/cancel" -Token $walletCustomer.token -Body @{
    mode = "WALLET_80"
  }

  Assert-True ([string]$walletCanceled.status -eq "CANCELED") "Pedido WALLET_80 ficou CANCELED"
  $walletCanceledTicket = Get-FirstTicket -Order $walletCanceled
  Assert-True ([string]$walletCanceledTicket.status -eq "CANCELED") "Ticket WALLET_80 ficou CANCELED"

  $walletCancellation = Get-CancellationForTicket -Order $walletCanceled -TicketId $walletTicket.id
  Assert-True ([bool]$walletCancellation) "Cancelamento WALLET_80 gerou registro"
  if ($walletCancellation) {
    Assert-True ([string]$walletCancellation.mode -eq "WALLET_80") "Registro WALLET_80 tem mode correto"
    Assert-True ((To-DecimalNumber $walletCancellation.originalAmount) -eq $walletUnitPrice) "Registro WALLET_80 guardou valor original"
    Assert-True ((To-DecimalNumber $walletCancellation.returnedAmount) -eq $walletExpected) "Registro WALLET_80 guardou 80%"
  }

  $walletSummary = Invoke-Api -Method "GET" -Path "/users/me/wallet" -Token $walletCustomer.token
  Assert-WalletCredit -Wallet $walletSummary -TicketId $walletTicket.id -ExpectedAmount $walletExpected

  $walletQr = Invoke-Api-ExpectError -Method "GET" -Path "/tickets/customer/$($walletTicket.id)/qr-token" -Token $walletCustomer.token
  Assert-True (-not [bool]$walletQr.ok) "QR bloqueado apos cancelamento WALLET_80"

  Log ""
  Log "============================================================"
  Log "[FLUXO 2] Cancelamento total com REFUND_60 banco"
  Log "============================================================"

  $bankCustomer = Create-TestCustomer -Kind "banco60"
  $bankCreated = Create-PaidOrderWithTickets -Customer $bankCustomer -TicketType $ticketType -Quantity 1 -PaymentMethod "PIX_TESTE_REFUND60"
  $bankOrder = $bankCreated.order
  $bankTicket = $bankCreated.tickets[0]
  $bankUnitPrice = Get-TicketUnitPrice -Order $bankOrder -TicketId $bankTicket.id
  $bankExpected = [decimal]::Round(($bankUnitPrice * [decimal]0.60), 2)

  $bankWalletBefore = Invoke-Api -Method "GET" -Path "/users/me/wallet" -Token $bankCustomer.token

  $bankCanceled = Invoke-Api -Method "PATCH" -Path "/orders/customer/$($bankOrder.id)/cancel" -Token $bankCustomer.token -Body @{
    mode = "REFUND_60"
  }

  Assert-True ([string]$bankCanceled.status -eq "CANCELED") "Pedido REFUND_60 ficou CANCELED"
  $bankCanceledTicket = Get-FirstTicket -Order $bankCanceled
  Assert-True ([string]$bankCanceledTicket.status -eq "CANCELED") "Ticket REFUND_60 ficou CANCELED"

  $bankCancellation = Get-CancellationForTicket -Order $bankCanceled -TicketId $bankTicket.id
  Assert-True ([bool]$bankCancellation) "Cancelamento REFUND_60 gerou registro"
  if ($bankCancellation) {
    Assert-True ([string]$bankCancellation.mode -eq "REFUND_60") "Registro REFUND_60 tem mode correto"
    Assert-True ((To-DecimalNumber $bankCancellation.originalAmount) -eq $bankUnitPrice) "Registro REFUND_60 guardou valor original"
    Assert-True ((To-DecimalNumber $bankCancellation.returnedAmount) -eq $bankExpected) "Registro REFUND_60 guardou 60% para estorno banco"
  }

  $bankWalletAfter = Invoke-Api -Method "GET" -Path "/users/me/wallet" -Token $bankCustomer.token
  Assert-NoWalletCredit -Wallet $bankWalletAfter -TicketId $bankTicket.id
  Assert-True ((To-DecimalNumber $bankWalletAfter.balance) -eq (To-DecimalNumber $bankWalletBefore.balance)) "REFUND_60 nao alterou saldo da wallet"

  $bankQr = Invoke-Api-ExpectError -Method "GET" -Path "/tickets/customer/$($bankTicket.id)/qr-token" -Token $bankCustomer.token
  Assert-True (-not [bool]$bankQr.ok) "QR bloqueado apos cancelamento REFUND_60"

  Log ""
  Log "============================================================"
  Log "[FLUXO 3] Cancelamento parcial de 1 ticket em pedido com 2"
  Log "============================================================"

  $partialCustomer = Create-TestCustomer -Kind "parcial"
  $partialCreated = Create-PaidOrderWithTickets -Customer $partialCustomer -TicketType $ticketType -Quantity 2 -PaymentMethod "PIX_TESTE_CANCELAMENTO_PARCIAL"
  $partialOrder = $partialCreated.order
  $partialTickets = $partialCreated.tickets
  $partialTicketCancel = $partialTickets[0]
  $partialTicketKeep = $partialTickets[1]
  $partialUnitPrice = Get-TicketUnitPrice -Order $partialOrder -TicketId $partialTicketCancel.id
  $partialExpectedWallet = [decimal]::Round(($partialUnitPrice * [decimal]0.80), 2)

  $partialCancelled = Invoke-Api -Method "PATCH" -Path "/orders/customer/tickets/$($partialTicketCancel.id)/cancel" -Token $partialCustomer.token -Body @{
    mode = "WALLET_80"
  }

  Assert-True ([string]$partialCancelled.status -eq "PAID") "Pedido parcial continua PAID"
  $partialAllTickets = Get-Tickets -Order $partialCancelled
  $cancelledCount = ($partialAllTickets | Where-Object { [string]$_.status -eq "CANCELED" }).Count
  $availableCount = ($partialAllTickets | Where-Object { [string]$_.status -eq "AVAILABLE" }).Count
  Assert-True ($cancelledCount -eq 1) "Pedido parcial tem 1 ticket CANCELED"
  Assert-True ($availableCount -eq 1) "Pedido parcial manteve 1 ticket AVAILABLE"

  $partialWallet = Invoke-Api -Method "GET" -Path "/users/me/wallet" -Token $partialCustomer.token
  Assert-WalletCredit -Wallet $partialWallet -TicketId $partialTicketCancel.id -ExpectedAmount $partialExpectedWallet

  $partialQrCanceled = Invoke-Api-ExpectError -Method "GET" -Path "/tickets/customer/$($partialTicketCancel.id)/qr-token" -Token $partialCustomer.token
  Assert-True (-not [bool]$partialQrCanceled.ok) "QR do ticket cancelado parcial foi bloqueado"

  $partialQrKept = Invoke-Api -Method "GET" -Path "/tickets/customer/$($partialTicketKeep.id)/qr-token" -Token $partialCustomer.token
  Assert-True ([bool]$partialQrKept.token) "QR do ticket mantido continua gerando"

  Log ""
  Log "============================================================"
  Log "[FLUXO 4] Cancelamento de ticket usado deve ser bloqueado"
  Log "============================================================"

  $usedCustomer = Create-TestCustomer -Kind "usado"
  $usedCreated = Create-PaidOrderWithTickets -Customer $usedCustomer -TicketType $ticketType -Quantity 1 -PaymentMethod "PIX_TESTE_USADO_BLOQUEIO"
  $usedOrder = $usedCreated.order
  $usedTicket = $usedCreated.tickets[0]

  $usedQr = Invoke-Api -Method "GET" -Path "/tickets/customer/$($usedTicket.id)/qr-token" -Token $usedCustomer.token
  Assert-True ([bool]$usedQr.token) "QR gerado para ticket que sera usado"

  $checkin = Invoke-Api -Method "POST" -Path "/tickets/validate" -Token $adminLogin.token -Body @{
    token = $usedQr.token
    gate = "Teste bloqueio cancelamento usado"
    markAsUsed = $true
  }

  Assert-True ([bool]$checkin.valid) "Check-in real validado"
  Assert-True ([string]$checkin.ticket.status -eq "USED") "Ticket ficou USED"

  $cancelUsedTicket = Invoke-Api-ExpectError -Method "PATCH" -Path "/orders/customer/tickets/$($usedTicket.id)/cancel" -Token $usedCustomer.token -Body @{
    mode = "WALLET_80"
  }

  Assert-True (-not [bool]$cancelUsedTicket.ok) "Cancelamento direto de ticket USED foi bloqueado"
  Assert-True ([string]$cancelUsedTicket.error -match "utilizado|usado|USED") "Mensagem de bloqueio do ticket USED foi retornada"

  Log ""
  Log "============================================================"
  Log "[FLUXO 5] Cancelamento cancela transferencia pendente"
  Log "============================================================"

  $transferCustomer = Create-TestCustomer -Kind "transfer-pendente-remetente"
  $transferRecipient = Create-TestCustomer -Kind "transfer-pendente-destinatario"
  $transferCreated = Create-PaidOrderWithTickets -Customer $transferCustomer -TicketType $ticketType -Quantity 1 -PaymentMethod "PIX_TESTE_CANCELA_TRANSFER"
  $transferOrder = $transferCreated.order
  $transferTicket = $transferCreated.tickets[0]

  $transfer = Invoke-Api -Method "POST" -Path "/tickets/customer/$($transferTicket.id)/transfer" -Token $transferCustomer.token -Body @{
    targetCpf = $transferRecipient.cpf
  }

  Assert-True ([string]$transfer.status -eq "PENDING_ACCEPTANCE") "Transferencia ficou pendente antes do cancelamento"

  $transferCancel = Invoke-Api -Method "PATCH" -Path "/orders/customer/tickets/$($transferTicket.id)/cancel" -Token $transferCustomer.token -Body @{
    mode = "WALLET_80"
  }

  Assert-True ([string]$transferCancel.status -eq "CANCELED") "Pedido com transferencia pendente ficou CANCELED apos cancelar unico ticket"

  $transferAfterCancel = Invoke-Api -Method "GET" -Path "/tickets/customer/transfers/$($transfer.id)" -Token $transferCustomer.token
  Assert-True ([string]$transferAfterCancel.status -eq "CANCELED") "Transferencia pendente foi cancelada junto com o ticket"
  Assert-True ([string]$transferAfterCancel.responseReason -match "Ticket cancelado|cancelado") "Transferencia recebeu motivo de cancelamento por ticket"

  Log ""
  Log "[INFO] Cancelamento aprofundado concluido:"
  Log "WALLET_80: order=$($walletOrder.id), ticket=$($walletTicket.id), credito=$walletExpected"
  Log "REFUND_60 banco: order=$($bankOrder.id), ticket=$($bankTicket.id), valor=$bankExpected"
  Log "Parcial: order=$($partialOrder.id), cancelado=$($partialTicketCancel.id), mantido=$($partialTicketKeep.id)"
  Log "Usado bloqueado: order=$($usedOrder.id), ticket=$($usedTicket.id)"
  Log "Transfer pendente cancelada: order=$($transferOrder.id), transfer=$($transfer.id)"

} catch {
  Fail $_.Exception.Message
}

Log ""
Log "============================================================"
Log "[RESUMO]"
Log "Passou: $Passed"
Log "Avisos: $Warnings"
Log "Falhas: $Failed"
Log "Relatorio: $ReportPath"
Log "============================================================"

if ($Failed -gt 0) {
  throw "Teste aprofundado de cancelamento terminou com $Failed falha(s). Veja: $ReportPath"
}
'@

Write-Utf8NoBom -Path $RunnerPath -Content $Runner
Write-Host "[OK] Runner aprofundado criado: $RunnerPath"

# Valida sintaxe TS basica via build.
Set-Location $ApiRoot
Write-Host "[INFO] Rodando build da API..."
npm run build *> log-api-cancel-refund60-build.txt

$BuildLogPath = Join-Path $ApiRoot "log-api-cancel-refund60-build.txt"
$Errors = Select-String -Path $BuildLogPath -Pattern "error|Error:|Failed|Cannot find|Type error|Module not found|cancel|refund|REFUND_60|WALLET_80|Prisma" -Context 2,3

if ($Errors) {
  Write-Host "[AVISO] Build gerou linhas filtradas. Veja abaixo:" -ForegroundColor Yellow
  $Errors | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "[OK] Build sem erros filtrados."
}

Write-Host ""
Write-Host "[OK] Cancelamento aprofundado preparado."
Write-Host ""
Write-Host "Agora reinicie a API e rode:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-cancellation-deep-real-api-tests.ps1"

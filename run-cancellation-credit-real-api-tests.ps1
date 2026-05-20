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
$ReportPath = Join-Path $ReportsDir "cancellation-credit-real-api-report-$Stamp.txt"

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

    $json = $Body | ConvertTo-Json -Depth 30
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
  $cpf = "96$random"
  $email = "cancel-credit-$Kind-$Stamp-$random@astroingressos.local"
  $password = "Teste1234!"
  $name = "Cliente Cancel Credito $Kind $random"

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


function Get-TicketUnitPrice {
  param(
    [object] $Order,
    [string] $TicketId
  )

  if ($null -eq $Order -or $null -eq $Order.items) {
    return 0
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
  if ($orderTotal -gt 0) {
    return $orderTotal
  }

  return 0
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

function To-DecimalNumber {
  param($Value)

  if ($null -eq $Value) {
    return 0
  }

  return [decimal]([string]$Value)
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
        [int]($_.quantity) -gt 0 -and
        [string]$_.status -eq "ACTIVE"
      } |
      Sort-Object @{ Expression = { if ($null -ne $_.displayOrder) { [int]$_.displayOrder } else { 9999 } } }, @{ Expression = { $_.createdAt } }
  )

  if ($eventTypes.Count -gt 0) {
    $selected = $eventTypes | Select-Object -First 1
    Pass "Tipo de ingresso existente escolhido: $($selected.name) / $($selected.id) / qtd=$($selected.quantity)"
    return $selected
  }

  Warn "Nenhum tipo de ingresso disponivel encontrado. Vou criar lote de teste para cancelamento."

  $newType = Invoke-Api -Method "POST" -Path "/ticket-types" -Body @{
    eventId = $EventId
    name = "Ingresso teste cancelamento $Stamp"
    lotLabel = "Lote teste cancelamento"
    description = "Criado automaticamente para teste real de cancelamento e credito"
    price = "10.00"
    quantity = 20
    minPerOrder = 1
    maxPerOrder = 5
    displayOrder = 999
    feeAmount = "0.00"
    feeDescription = "Sem taxa no teste"
    isHidden = $false
    status = "ACTIVE"
  }

  Pass "Tipo de ingresso de teste criado: $($newType.name) / $($newType.id)"

  return $newType
}

function Create-PaidOrderWithTicket {
  param(
    [hashtable] $Customer,
    [object] $TicketType,
    [string] $PaymentMethod
  )

  $customerName = $Customer.user.name
  if ([string]::IsNullOrWhiteSpace($customerName)) {
    $customerName = "Cliente Cancel Credito"
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

  $orderBody = @{
    eventId = $EventId
    customerName = $customerName
    customerEmail = $customerEmail
    customerCpf = $customerCpf
    items = @(
      @{
        ticketTypeId = $TicketType.id
        quantity = 1
        holders = @(
          @{
            name = $customerName
            email = $customerEmail
            cpf = $customerCpf
          }
        )
      }
    )
    useWalletBalance = $false
  }

  $beforeType = Invoke-Api -Method "GET" -Path "/ticket-types/$($TicketType.id)"

  $orderResponse = Invoke-Api -Method "POST" -Path "/orders/customer" -Token $Customer.token -Body $orderBody
  $order = Resolve-OrderResponse -Response $orderResponse

  Assert-True ([bool]$order.id) "Pedido criado: $($order.id)"
  Assert-True ((Count-Items $order) -gt 0) "Pedido criado com item"
  Assert-True ((Count-Tickets $order) -gt 0) "Pedido criado com ticket"

  $afterCreateType = Invoke-Api -Method "GET" -Path "/ticket-types/$($TicketType.id)"
  Assert-True ([int]$afterCreateType.quantity -eq ([int]$beforeType.quantity - 1)) "Estoque decrementou apos criar pedido"

  $payment = Invoke-Api -Method "POST" -Path "/payments/customer/$($order.id)/finalize" -Token $Customer.token -Body @{
    method = $PaymentMethod
  }

  Assert-True ([bool]$payment.id) "Pagamento finalizado: $($payment.id)"

  $paidOrder = Invoke-Api -Method "GET" -Path "/orders/customer/$($order.id)" -Token $Customer.token
  $ticket = Get-FirstTicket -Order $paidOrder

  Assert-True ([string]$paidOrder.status -eq "PAID") "Pedido ficou PAID"
  Assert-True ([bool]$ticket.id) "Ticket encontrado no pedido pago"
  Assert-True ([string]$ticket.status -eq "AVAILABLE") "Ticket esta AVAILABLE"

  return @{
    order = $paidOrder
    ticket = $ticket
    beforeType = $beforeType
    afterCreateType = $afterCreateType
    unitPrice = Get-TicketUnitPrice -Order $paidOrder -TicketId $ticket.id
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

Log "[INFO] Teste REAL de cancelamento, credito e bloqueios"
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

  Log ""
  Log "============================================================"
  Log "[FLUXO 1] Criar pedido pago e cancelar com credito"
  Log "============================================================"

  $customer = Create-TestCustomer -Kind "principal"
  $created = Create-PaidOrderWithTicket -Customer $customer -TicketType $ticketType -PaymentMethod "PIX_TESTE_CANCELAMENTO"
  $order = $created.order
  $ticket = $created.ticket
  $beforeType = $created.beforeType
  $unitPrice = $created.unitPrice
  $expectedCredit = [decimal]::Round(($unitPrice * [decimal]0.80), 2)

  Log "[INFO] OrderId: $($order.id)"
  Log "[INFO] TicketId: $($ticket.id)"
  Log "[INFO] UnitPrice: $unitPrice"
  Log "[INFO] Credito esperado 80%: $expectedCredit"

  $cancelled = Invoke-Api -Method "PATCH" -Path "/orders/customer/$($order.id)/cancel" -Token $customer.token -Body @{
    mode = "WALLET_80"
  }

  Assert-True ([string]$cancelled.status -eq "CANCELED") "Pedido ficou CANCELED apos cancelamento"
  $cancelledTicket = Get-FirstTicket -Order $cancelled
  Assert-True ([string]$cancelledTicket.status -eq "CANCELED") "Ticket ficou CANCELED"

  $afterCancelType = Invoke-Api -Method "GET" -Path "/ticket-types/$($ticketType.id)"
  Assert-True ([int]$afterCancelType.quantity -eq [int]$beforeType.quantity) "Estoque voltou para o valor anterior ao pedido"

  $qrAfterCancel = Invoke-Api-ExpectError -Method "GET" -Path "/tickets/customer/$($ticket.id)/qr-token" -Token $customer.token
  Assert-True (-not [bool]$qrAfterCancel.ok) "QR nao pode ser gerado para ticket cancelado"

  $wallet = Invoke-Api -Method "GET" -Path "/users/me/wallet" -Token $customer.token
  $creditTx = Get-WalletCreditForTicket -Wallet $wallet -TicketId $ticket.id

  Assert-True ([bool]$creditTx) "Wallet recebeu transacao de credito por cancelamento do ticket"

  if ($creditTx) {
    Assert-True ([string]$creditTx.type -eq "CREDIT") "Transacao da wallet e CREDIT"
    Assert-True ([string]$creditTx.source -eq "TICKET_CANCELLATION") "Transacao da wallet tem source TICKET_CANCELLATION"

    $creditAmount = To-DecimalNumber $creditTx.amount
    Assert-True ($creditAmount -eq $expectedCredit) "Credito da wallet equivale a 80% do ingresso"
    Assert-True ((To-DecimalNumber $wallet.balance) -ge $expectedCredit) "Saldo da wallet reflete credito gerado"
  }

  $cancelAgain = Invoke-Api-ExpectError -Method "PATCH" -Path "/orders/customer/$($order.id)/cancel" -Token $customer.token -Body @{
    mode = "WALLET_80"
  }

  Assert-True (-not [bool]$cancelAgain.ok) "Segundo cancelamento do mesmo pedido foi bloqueado"

  Log ""
  Log "============================================================"
  Log "[FLUXO 2] Cancelamento de ticket usado deve ser bloqueado"
  Log "============================================================"

  $usedCustomer = Create-TestCustomer -Kind "usado"
  $usedCreated = Create-PaidOrderWithTicket -Customer $usedCustomer -TicketType $ticketType -PaymentMethod "PIX_TESTE_CANCELAMENTO_USADO"
  $usedOrder = $usedCreated.order
  $usedTicket = $usedCreated.ticket

  $qr = Invoke-Api -Method "GET" -Path "/tickets/customer/$($usedTicket.id)/qr-token" -Token $usedCustomer.token
  Assert-True ([bool]$qr.token) "QR gerado para ingresso que sera usado"

  $adminLogin = Login -RoleLabel "ADMIN validador" -Cpf "11111111111" -Password "123456"

  $checkin = Invoke-Api -Method "POST" -Path "/tickets/validate" -Token $adminLogin.token -Body @{
    token = $qr.token
    gate = "Teste cancelamento bloqueado"
    markAsUsed = $true
  }

  Assert-True ([bool]$checkin.valid) "Check-in real do ingresso usado foi validado"
  Assert-True ([string]$checkin.ticket.status -eq "USED") "Ticket usado ficou USED"

  $cancelUsedTicket = Invoke-Api-ExpectError -Method "PATCH" -Path "/orders/customer/tickets/$($usedTicket.id)/cancel" -Token $usedCustomer.token -Body @{
    mode = "WALLET_80"
  }

  Assert-True (-not [bool]$cancelUsedTicket.ok) "Cancelamento direto de ticket USED foi bloqueado"
  Assert-True ([string]$cancelUsedTicket.error -match "utilizado|usado|USED") "Mensagem de bloqueio do ticket usado foi retornada"

  Log ""
  Log "[INFO] Fluxo cancelamento/crédito completo:"
  Log "Pedido cancelado: $($order.id)"
  Log "Ticket cancelado: $($ticket.id)"
  Log "Credito wallet: $expectedCredit"
  Log "Pedido usado testado: $($usedOrder.id)"
  Log "Ticket usado bloqueado: $($usedTicket.id)"

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
  throw "Teste real de cancelamento/credito terminou com $Failed falha(s). Veja: $ReportPath"
}
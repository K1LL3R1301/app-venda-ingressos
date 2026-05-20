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
$ReportPath = Join-Path $ReportsDir "ticket-transfer-return-real-api-report-$Stamp.txt"

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
  $cpf = "97$random"
  $email = "transfer-return-$Kind-$Stamp-$random@astroingressos.local"
  $password = "Teste1234!"
  $name = "Cliente Transfer Return $Kind $random"

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

  Warn "Nenhum tipo de ingresso disponivel encontrado. Vou criar um lote de teste para devolucao."

  $newType = Invoke-Api -Method "POST" -Path "/ticket-types" -Body @{
    eventId = $EventId
    name = "Ingresso teste transferencia devolucao $Stamp"
    lotLabel = "Lote teste transferencia devolucao"
    description = "Criado automaticamente para teste real de transferencia e devolucao"
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
    [hashtable] $Sender,
    [object] $TicketType
  )

  $senderName = $Sender.user.name
  if ([string]::IsNullOrWhiteSpace($senderName)) {
    $senderName = "Cliente Transfer Remetente"
  }

  $senderEmail = $Sender.user.email
  if ([string]::IsNullOrWhiteSpace($senderEmail)) {
    throw "Usuario remetente nao tem email."
  }

  $senderCpf = [string]$Sender.user.cpf
  if ([string]::IsNullOrWhiteSpace($senderCpf)) {
    $senderCpf = [string]$Sender.cpf
  }
  $senderCpf = $senderCpf -replace '\D', ''

  $orderBody = @{
    eventId = $EventId
    customerName = $senderName
    customerEmail = $senderEmail
    customerCpf = $senderCpf
    items = @(
      @{
        ticketTypeId = $TicketType.id
        quantity = 1
        holders = @(
          @{
            name = $senderName
            email = $senderEmail
            cpf = $senderCpf
          }
        )
      }
    )
    useWalletBalance = $false
  }

  $orderResponse = Invoke-Api -Method "POST" -Path "/orders/customer" -Token $Sender.token -Body $orderBody
  $order = Resolve-OrderResponse -Response $orderResponse

  Assert-True ([bool]$order.id) "Pedido criado para transferencia/devolucao: $($order.id)"
  Assert-True ((Count-Items $order) -gt 0) "Pedido criado com item"
  Assert-True ((Count-Tickets $order) -gt 0) "Pedido criado com ticket"

  $payment = Invoke-Api -Method "POST" -Path "/payments/customer/$($order.id)/finalize" -Token $Sender.token -Body @{
    method = "PIX_TESTE_TRANSFERENCIA_DEVOLUCAO"
  }

  Assert-True ([bool]$payment.id) "Pagamento finalizado: $($payment.id)"

  $paidOrder = Invoke-Api -Method "GET" -Path "/orders/customer/$($order.id)" -Token $Sender.token
  $ticket = Get-FirstTicket -Order $paidOrder

  Assert-True ([string]$paidOrder.status -eq "PAID") "Pedido ficou PAID"
  Assert-True ([bool]$ticket.id) "Ticket encontrado no pedido pago"
  Assert-True ([string]$ticket.status -eq "AVAILABLE") "Ticket esta AVAILABLE"

  return @{
    order = $paidOrder
    ticket = $ticket
  }
}

function Find-TransferById {
  param(
    [array] $List,
    [string] $Id
  )

  foreach ($item in @($List)) {
    if ([string]$item.id -eq [string]$Id) {
      return $item
    }
  }

  return $null
}

Log "[INFO] Teste REAL de transferencia, bloqueio para terceiros e devolucao"
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
  Log "[FLUXO 1] Criar usuarios limpos"
  Log "============================================================"

  $sender = Create-TestCustomer -Kind "remetente"
  $recipient = Create-TestCustomer -Kind "destinatario"
  $third = Create-TestCustomer -Kind "terceiro"

  Log ""
  Log "============================================================"
  Log "[FLUXO 2] Criar pedido pago e transferir para destinatario"
  Log "============================================================"

  $created = Create-PaidOrderWithTicket -Sender $sender -TicketType $ticketType
  $order = $created.order
  $ticket = $created.ticket

  $transfer = Invoke-Api -Method "POST" -Path "/tickets/customer/$($ticket.id)/transfer" -Token $sender.token -Body @{
    targetCpf = $recipient.cpf
  }

  Assert-True ([bool]$transfer.id) "Transferencia original criada: $($transfer.id)"
  Assert-True ([string]$transfer.status -eq "PENDING_ACCEPTANCE") "Transferencia original ficou aguardando aceite"
  Assert-True ([string]$transfer.toUserId -eq [string]$recipient.user.id) "Transferencia original foi para destinatario correto"

  $accepted = Invoke-Api -Method "PATCH" -Path "/tickets/customer/transfers/$($transfer.id)/accept" -Token $recipient.token

  Assert-True ([string]$accepted.status -eq "ACCEPTED") "Destinatario aceitou a transferencia"
  Assert-True ([string]$accepted.ticket.status -eq "AVAILABLE") "Ticket ficou AVAILABLE com destinatario"
  Assert-True ([string]$accepted.ticket.currentOwnerUserId -eq [string]$recipient.user.id) "Destinatario virou dono atual"
  Assert-True ([bool]$accepted.ticket.receivedViaTransferLocked) "Ticket recebido ficou travado"

  Log ""
  Log "============================================================"
  Log "[FLUXO 3] Destinatario nao pode transferir para terceiro"
  Log "============================================================"

  $thirdTransferAttempt = Invoke-Api-ExpectError -Method "POST" -Path "/tickets/customer/$($ticket.id)/transfer" -Token $recipient.token -Body @{
    targetCpf = $third.cpf
  }

  Assert-True (-not [bool]$thirdTransferAttempt.ok) "Transferencia do destinatario para terceiro foi bloqueada"
  Assert-True ([string]$thirdTransferAttempt.error -match "so pode ser devolvido|transferido uma vez|originalmente") "Mensagem de bloqueio para terceiro foi retornada"

  Log "[INFO] Erro esperado ao tentar terceiro:"
  Log ([string]$thirdTransferAttempt.error)

  $ticketAfterThirdAttempt = Invoke-Api -Method "GET" -Path "/tickets/$($ticket.id)"
  Assert-True ([string]$ticketAfterThirdAttempt.status -eq "AVAILABLE") "Ticket continuou AVAILABLE apos tentativa bloqueada para terceiro"
  Assert-True ([string]$ticketAfterThirdAttempt.currentOwnerUserId -eq [string]$recipient.user.id) "Dono continuou sendo o destinatario apos bloqueio"

  Log ""
  Log "============================================================"
  Log "[FLUXO 4] Destinatario devolve para remetente original"
  Log "============================================================"

  $returnTransfer = Invoke-Api -Method "POST" -Path "/tickets/customer/$($ticket.id)/transfer" -Token $recipient.token -Body @{
    targetCpf = $sender.cpf
  }

  Assert-True ([bool]$returnTransfer.id) "Solicitacao de devolucao criada: $($returnTransfer.id)"
  Assert-True ([string]$returnTransfer.status -eq "PENDING_ACCEPTANCE") "Devolucao ficou aguardando aceite"
  Assert-True ([string]$returnTransfer.mode -eq "RETURN") "Devolucao foi marcada como RETURN"
  Assert-True ([string]$returnTransfer.toUserId -eq [string]$sender.user.id) "Devolucao foi para remetente original"

  $incomingForSender = To-Array (Invoke-Api -Method "GET" -Path "/tickets/customer/transfers/incoming" -Token $sender.token)
  Assert-True ([bool](Find-TransferById -List $incomingForSender -Id $returnTransfer.id)) "Remetente original ve devolucao nas entradas"

  $ticketAfterReturnRequest = Invoke-Api -Method "GET" -Path "/tickets/$($ticket.id)"
  Assert-True ([string]$ticketAfterReturnRequest.status -eq "TRANSFER_PENDING") "Ticket ficou TRANSFER_PENDING enquanto devolucao aguarda aceite"

  Log ""
  Log "============================================================"
  Log "[FLUXO 5] Remetente original aceita devolucao"
  Log "============================================================"

  $acceptedReturn = Invoke-Api -Method "PATCH" -Path "/tickets/customer/transfers/$($returnTransfer.id)/accept" -Token $sender.token

  Assert-True ([string]$acceptedReturn.status -eq "ACCEPTED") "Remetente original aceitou a devolucao"
  Assert-True ([string]$acceptedReturn.ticket.status -eq "AVAILABLE") "Ticket voltou para AVAILABLE"
  Assert-True ([string]$acceptedReturn.ticket.currentOwnerUserId -eq [string]$sender.user.id) "Ticket voltou para o remetente original"
  Assert-True (-not [bool]$acceptedReturn.ticket.receivedViaTransferLocked) "Ticket voltou destravado apos devolucao"

  Log ""
  Log "============================================================"
  Log "[FLUXO 6] QR apos devolucao"
  Log "============================================================"

  $senderQr = Invoke-Api -Method "GET" -Path "/tickets/customer/$($ticket.id)/qr-token" -Token $sender.token
  Assert-True ([bool]$senderQr.token) "Remetente original consegue gerar QR apos devolucao"
  Assert-True ([string]$senderQr.ticketId -eq [string]$ticket.id) "QR apos devolucao pertence ao ticket correto"

  $recipientQr = Invoke-Api-ExpectError -Method "GET" -Path "/tickets/customer/$($ticket.id)/qr-token" -Token $recipient.token
  Assert-True (-not [bool]$recipientQr.ok) "Destinatario nao consegue mais gerar QR apos devolver"

  Log ""
  Log "[INFO] Fluxo completo:"
  Log "OrderId: $($order.id)"
  Log "TicketId: $($ticket.id)"
  Log "Transferencia original: $($transfer.id)"
  Log "Devolucao: $($returnTransfer.id)"
  Log "Remetente: $($sender.user.email) / CPF $($sender.cpf)"
  Log "Destinatario: $($recipient.user.email) / CPF $($recipient.cpf)"
  Log "Terceiro bloqueado: $($third.user.email) / CPF $($third.cpf)"

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
  throw "Teste real de transferencia/devolucao terminou com $Failed falha(s). Veja: $ReportPath"
}
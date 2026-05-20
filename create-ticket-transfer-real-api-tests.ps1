$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunnerPath = Join-Path $ProjectRoot "run-ticket-transfer-real-api-tests.ps1"

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

if (Test-Path -LiteralPath $RunnerPath) {
  $StampBackup = Get-Date -Format "yyyyMMdd-HHmmss"
  $BackupPath = "$RunnerPath.bak-transfer-real-$StampBackup"
  Copy-Item -LiteralPath $RunnerPath -Destination $BackupPath -Force
  Write-Host "[OK] Backup criado: $BackupPath"
}

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
$ReportPath = Join-Path $ReportsDir "ticket-transfer-real-api-report-$Stamp.txt"

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
  param(
    [string] $Kind
  )

  $random = Get-Random -Minimum 100000000 -Maximum 999999999
  $cpf = "98$random"
  $email = "transfer-$Kind-$Stamp-$random@astroingressos.local"
  $password = "Teste1234!"
  $name = "Cliente Transfer $Kind $random"

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

  Warn "Nenhum tipo de ingresso disponivel encontrado. Vou criar um lote de teste para transferencia."

  $newType = Invoke-Api -Method "POST" -Path "/ticket-types" -Body @{
    eventId = $EventId
    name = "Ingresso teste transferencia $Stamp"
    lotLabel = "Lote teste transferencia"
    description = "Criado automaticamente para teste real de transferencia"
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

  Assert-True ([bool]$order.id) "Pedido criado para transferencia: $($order.id)"
  Assert-True ((Count-Items $order) -gt 0) "Pedido criado com item"
  Assert-True ((Count-Tickets $order) -gt 0) "Pedido criado com ticket"

  $payment = Invoke-Api -Method "POST" -Path "/payments/customer/$($order.id)/finalize" -Token $Sender.token -Body @{
    method = "PIX_TESTE_TRANSFERENCIA"
  }

  Assert-True ([bool]$payment.id) "Pagamento finalizado: $($payment.id)"

  $paidOrder = Invoke-Api -Method "GET" -Path "/orders/customer/$($order.id)" -Token $Sender.token
  $ticket = Get-FirstTicket -Order $paidOrder

  Assert-True ([string]$paidOrder.status -eq "PAID") "Pedido ficou PAID"
  Assert-True ([bool]$ticket.id) "Ticket encontrado no pedido pago"
  Assert-True ([string]$ticket.status -eq "AVAILABLE") "Ticket esta AVAILABLE para transferencia"

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

Log "[INFO] Teste REAL de transferencia de ingresso"
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
  Log "[FLUXO 1] Criar usuarios limpos para transferencia"
  Log "============================================================"

  $sender = Create-TestCustomer -Kind "remetente"
  $recipient = Create-TestCustomer -Kind "destinatario"

  Log ""
  Log "============================================================"
  Log "[FLUXO 2] Criar pedido pago e ticket AVAILABLE para o remetente"
  Log "============================================================"

  $created = Create-PaidOrderWithTicket -Sender $sender -TicketType $ticketType
  $order = $created.order
  $ticket = $created.ticket

  Log "[INFO] OrderId: $($order.id)"
  Log "[INFO] TicketId: $($ticket.id)"
  Log "[INFO] Ticket code: $($ticket.code)"
  Log "[INFO] Destinatario CPF: $($recipient.cpf)"

  Log ""
  Log "============================================================"
  Log "[FLUXO 3] Remetente solicita transferencia"
  Log "============================================================"

  $transfer = Invoke-Api -Method "POST" -Path "/tickets/customer/$($ticket.id)/transfer" -Token $sender.token -Body @{
    targetCpf = $recipient.cpf
  }

  Assert-True ([bool]$transfer.id) "Solicitacao de transferencia criada: $($transfer.id)"
  Assert-True ([string]$transfer.status -eq "PENDING_ACCEPTANCE") "Transferencia ficou aguardando aceite"
  Assert-True ([string]$transfer.ticketId -eq [string]$ticket.id) "Transferencia vinculada ao ticket correto"
  Assert-True ([string]$transfer.toUserId -eq [string]$recipient.user.id) "Transferencia destinada ao usuario correto"

  $ticketAfterTransfer = Invoke-Api -Method "GET" -Path "/tickets/$($ticket.id)"
  Assert-True ([string]$ticketAfterTransfer.status -eq "TRANSFER_PENDING") "Ticket ficou TRANSFER_PENDING enquanto aguarda aceite"

  $outgoing = To-Array (Invoke-Api -Method "GET" -Path "/tickets/customer/transfers/outgoing" -Token $sender.token)
  Assert-True ([bool](Find-TransferById -List $outgoing -Id $transfer.id)) "Remetente visualiza transferencia em saidas"

  $incoming = To-Array (Invoke-Api -Method "GET" -Path "/tickets/customer/transfers/incoming" -Token $recipient.token)
  Assert-True ([bool](Find-TransferById -List $incoming -Id $transfer.id)) "Destinatario visualiza transferencia em entradas"

  Log ""
  Log "============================================================"
  Log "[FLUXO 4] Destinatario aceita transferencia"
  Log "============================================================"

  $accepted = Invoke-Api -Method "PATCH" -Path "/tickets/customer/transfers/$($transfer.id)/accept" -Token $recipient.token

  Assert-True ([string]$accepted.status -eq "ACCEPTED") "Transferencia foi aceita"
  Assert-True ([string]$accepted.ticket.status -eq "AVAILABLE") "Ticket voltou para AVAILABLE apos aceite"
  Assert-True ([string]$accepted.ticket.currentOwnerUserId -eq [string]$recipient.user.id) "Novo dono do ticket e o destinatario"
  Assert-True ([string]$accepted.ticket.holderCpf -eq [string]$recipient.cpf) "Titular do ticket mudou para CPF do destinatario"
  Assert-True ([bool]$accepted.ticket.receivedViaTransferLocked) "Ticket recebido ficou travado para transferencia unica"

  Log ""
  Log "============================================================"
  Log "[FLUXO 5] Validar QR com novo dono e bloquear antigo dono"
  Log "============================================================"

  $recipientQr = Invoke-Api -Method "GET" -Path "/tickets/customer/$($ticket.id)/qr-token" -Token $recipient.token
  Assert-True ([bool]$recipientQr.token) "Novo dono consegue gerar QR"
  Assert-True ([string]$recipientQr.ticketId -eq [string]$ticket.id) "QR do novo dono pertence ao ticket transferido"

  $oldOwnerQr = Invoke-Api-ExpectError -Method "GET" -Path "/tickets/customer/$($ticket.id)/qr-token" -Token $sender.token
  Assert-True (-not [bool]$oldOwnerQr.ok) "Dono antigo nao consegue mais gerar QR do ticket transferido"

  Log ""
  Log "[INFO] Transferencia concluida:"
  Log "TransferId: $($transfer.id)"
  Log "OrderId: $($order.id)"
  Log "TicketId: $($ticket.id)"
  Log "Novo dono: $($recipient.user.email) / CPF $($recipient.cpf)"

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
  throw "Teste real de transferencia terminou com $Failed falha(s). Veja: $ReportPath"
}
'@

Write-Utf8NoBom -Path $RunnerPath -Content $Runner

$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile($RunnerPath, [ref]$tokens, [ref]$errors) | Out-Null

if ($errors -and $errors.Count -gt 0) {
  Write-Host "[ERRO] Erro de sintaxe no runner criado:" -ForegroundColor Red
  foreach ($err in $errors) {
    Write-Host " - Linha $($err.Extent.StartLineNumber): $($err.Message)" -ForegroundColor Red
  }
  throw "Runner criado com erro de sintaxe."
}

Write-Host "[OK] Script criado e validado:"
Write-Host "     $RunnerPath"
Write-Host ""
Write-Host "Rode o teste real de transferencia:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-ticket-transfer-real-api-tests.ps1"

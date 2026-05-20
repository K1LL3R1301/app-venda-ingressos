param(
  [string] $BaseUrl = "http://localhost:3001/v1",
  [string] $OrderId = "",
  [string] $TicketId = "",
  [switch] $MarkAsUsed
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReportsDir = Join-Path $ProjectRoot "apps\web\test-results\reports"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $ReportsDir "direct-ticket-qr-real-api-report-$Stamp.txt"

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

function Secure-ToPlain {
  param([Security.SecureString] $Secure)

  if ($null -eq $Secure) { return "" }

  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

function Read-CredentialPair {
  param([string] $RoleName)

  Write-Host ""
  Write-Host "Credenciais para $RoleName"
  $cpf = Read-Host "CPF $RoleName"
  if ([string]::IsNullOrWhiteSpace($cpf)) {
    throw "CPF obrigatorio para $RoleName."
  }

  $secure = Read-Host "Senha $RoleName" -AsSecureString
  $password = Secure-ToPlain $secure

  if ([string]::IsNullOrWhiteSpace($password)) {
    throw "Senha obrigatoria para $RoleName."
  }

  return @{
    cpf = $cpf.Trim()
    password = $password
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

    $json = $Body | ConvertTo-Json -Depth 20
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

function Login {
  param(
    [string] $RoleLabel,
    [hashtable] $Credential
  )

  $data = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    cpf = $Credential.cpf
    password = $Credential.password
  }

  if (!$data.accessToken) {
    throw "Login de $RoleLabel nao retornou accessToken."
  }

  Pass "Login $RoleLabel realizado: $($data.user.email) / $($data.user.role)"

  return @{
    token = $data.accessToken
    user = $data.user
  }
}

function Get-MaskedToken {
  param([string] $Token)

  if ([string]::IsNullOrWhiteSpace($Token)) {
    return ""
  }

  if ($Token.Length -le 24) {
    return $Token
  }

  return "$($Token.Substring(0, 16))...$($Token.Substring($Token.Length - 8))"
}

Log "[INFO] Teste DIRETO de QR por TicketId"
Log "[INFO] BaseUrl: $BaseUrl"
Log "[INFO] Relatorio: $ReportPath"
Log ""

try {
  try {
    Invoke-RestMethod -Method GET -Uri "$BaseUrl" -TimeoutSec 4 | Out-Null
    Pass "API respondeu em $BaseUrl"
  } catch {
    Warn "Nao consegui validar GET $BaseUrl. Vou tentar os endpoints mesmo assim."
  }

  if ([string]::IsNullOrWhiteSpace($OrderId)) {
    $OrderId = Read-Host "OrderId real PAID"
  }

  if ([string]::IsNullOrWhiteSpace($TicketId)) {
    $TicketId = Read-Host "TicketId real AVAILABLE"
  }

  if ([string]::IsNullOrWhiteSpace($OrderId)) {
    throw "OrderId e obrigatorio."
  }

  if ([string]::IsNullOrWhiteSpace($TicketId)) {
    throw "TicketId e obrigatorio."
  }

  $customerCred = Read-CredentialPair -RoleName "CUSTOMER dono do ticket"
  $operatorCred = Read-CredentialPair -RoleName "OPERATOR ou ADMIN validador"

  $customer = Login -RoleLabel "CUSTOMER" -Credential $customerCred
  $operator = Login -RoleLabel "OPERATOR/ADMIN" -Credential $operatorCred

  Log ""
  Log "============================================================"
  Log "[FLUXO 1] Conferir pedido real"
  Log "============================================================"

  $order = Invoke-Api -Method "GET" -Path "/orders/customer/$OrderId" -Token $customer.token

  Assert-True ([string]$order.id -eq [string]$OrderId) "Pedido retornou o mesmo ID informado"
  Assert-True ([string]$order.status -eq "PAID") "Pedido esta PAID"
  Assert-True ([bool]$order.event.id) "Pedido possui evento: $($order.event.name)"

  Log ""
  Log "============================================================"
  Log "[FLUXO 2] Gerar QR Code pelo TicketId"
  Log "============================================================"

  $qr = Invoke-Api -Method "GET" -Path "/tickets/customer/$TicketId/qr-token" -Token $customer.token

  Assert-True ([bool]$qr.token) "QR token foi gerado"
  Assert-True ([string]$qr.ticketId -eq [string]$TicketId) "QR pertence ao TicketId informado"
  Assert-True ([string]$qr.status -eq "AVAILABLE") "Ticket esta AVAILABLE para QR"
  Assert-True ([bool]$qr.expiresAt) "QR tem validade"

  Log "[INFO] Token mascarado: $(Get-MaskedToken $qr.token)"
  Log "[INFO] Ticket code: $($qr.code)"
  Log "[INFO] Expira em: $($qr.expiresAt)"

  Log ""
  Log "============================================================"
  Log "[FLUXO 3] Validar QR sem consumir ingresso"
  Log "============================================================"

  $dryRun = Invoke-Api -Method "POST" -Path "/tickets/validate" -Token $operator.token -Body @{
    token = $qr.token
    gate = "Teste direto sem consumir"
    markAsUsed = $false
  }

  Assert-True ([bool]$dryRun.valid) "Operador validou QR como valido sem consumir"
  Assert-True ([string]$dryRun.ticket.id -eq [string]$TicketId) "Validacao retornou o mesmo ticket"
  Assert-True ([string]$dryRun.order.id -eq [string]$OrderId) "Validacao retornou o mesmo pedido"
  Assert-True ([string]$dryRun.event.id -eq [string]$order.event.id) "Validacao retornou o mesmo evento"

  Log ""
  Log "[INFO] Resultado dry-run:"
  Log ($dryRun | ConvertTo-Json -Depth 10)

  if ($MarkAsUsed) {
    Log ""
    Log "============================================================"
    Log "[FLUXO 4] Check-in REAL marcando ingresso como usado"
    Log "============================================================"
    Warn "MarkAsUsed foi informado. Este ingresso sera marcado como USED no banco real."

    $used = Invoke-Api -Method "POST" -Path "/tickets/validate" -Token $operator.token -Body @{
      token = $qr.token
      gate = "Entrada teste direto real"
      markAsUsed = $true
    }

    Assert-True ([bool]$used.valid) "Check-in real foi validado"
    Assert-True ([string]$used.ticket.status -eq "USED") "Ticket ficou USED"
    Assert-True ([bool]$used.checkin.id) "Check-in foi registrado"

    $secondTry = Invoke-Api -Method "POST" -Path "/tickets/validate" -Token $operator.token -Body @{
      token = $qr.token
      gate = "Entrada duplicada teste"
      markAsUsed = $true
    }

    Assert-True (-not [bool]$secondTry.valid) "Segunda entrada do mesmo QR foi bloqueada"

    Log ""
    Log "[INFO] Resultado da segunda tentativa bloqueada:"
    Log ($secondTry | ConvertTo-Json -Depth 10)

    $secondReason = [string]$secondTry.reason
    $secondTicketStatus = [string]$secondTry.ticket.status

    Assert-True (
      (-not [string]::IsNullOrWhiteSpace($secondReason)) -or
      ($secondTicketStatus -eq "USED")
    ) "Motivo ou status da duplicidade retornado"

    Log ""
    Log "[INFO] Resultado check-in real:"
    Log ($used | ConvertTo-Json -Depth 10)
  } else {
    Warn "Check-in REAL nao foi executado para nao consumir ingresso. Para consumir, rode com -MarkAsUsed."
  }

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
  throw "Teste direto de QR terminou com $Failed falha(s). Veja: $ReportPath"
}
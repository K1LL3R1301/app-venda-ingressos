param(
  [string] $BaseUrl = "http://localhost:3001/v1",
  [string] $EventId = "",
  [string] $EventName = ""
)


$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReportsDir = Join-Path $ProjectRoot "apps\web\test-results\reports"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $ReportsDir "support-real-api-report-$Stamp.txt"

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
  param(
    [string] $RoleName,
    [bool] $Required = $true
  )

  Write-Host ""
  Write-Host "Credenciais para $RoleName"
  if (-not $Required) {
    Write-Host "Pressione Enter no CPF para pular."
  }

  $cpf = Read-Host "CPF $RoleName"
  if ([string]::IsNullOrWhiteSpace($cpf)) {
    if ($Required) {
      throw "CPF obrigatorio para $RoleName."
    }

    return $null
  }

  $secure = Read-Host "Senha $RoleName" -AsSecureString
  $password = Secure-ToPlain $secure

  if ([string]::IsNullOrWhiteSpace($password)) {
    if ($Required) {
      throw "Senha obrigatoria para $RoleName."
    }

    return $null
  }

  return @{
    cpf = $cpf
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

  if ($null -eq $Credential) {
    Warn "$RoleLabel pulado."
    return $null
  }

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

function Find-Thread {
  param(
    [array] $Threads,
    [string] $ThreadId
  )

  foreach ($thread in $Threads) {
    if ([string]$thread.id -eq [string]$ThreadId) {
      return $thread
    }
  }

  return $null
}

function Message-Count {
  param([object] $Thread)

  if ($null -eq $Thread.messages) {
    return 0
  }

  return @($Thread.messages).Count
}

function Create-LinkedThread {
  param(
    [hashtable] $Session,
    [hashtable] $Body,
    [string] $Label
  )

  $thread = Invoke-Api -Method "POST" -Path "/support/linked" -Token $Session.token -Body $Body

  Assert-True ([bool]$thread.id) "$Label criou chamado interligado com id $($thread.id)"
  Assert-True ([string]$thread.eventId -eq [string]$Body.eventId) "$Label ficou vinculado ao eventId correto"
  Assert-True ((Message-Count $thread) -ge 1) "$Label criou mensagem inicial"

  return $thread
}

function Add-Message {
  param(
    [hashtable] $Session,
    [string] $ThreadId,
    [string] $Message,
    [string] $Label
  )

  $thread = Invoke-Api -Method "POST" -Path "/support/linked/$ThreadId/messages" -Token $Session.token -Body @{
    message = $Message
    targetType = "ALL"
    internal = $false
  }

  Assert-True ((Message-Count $thread) -ge 2) "$Label adicionou mensagem no chat"
  return $thread
}

function Forward-Super {
  param(
    [hashtable] $Session,
    [string] $ThreadId,
    [string] $Reason,
    [string] $Label
  )

  $thread = Invoke-Api -Method "POST" -Path "/support/linked/$ThreadId/forward-super" -Token $Session.token -Body @{
    reason = $Reason
  }

  Assert-True ([string]$thread.status -eq "FORWARDED_TO_SUPER_ADMIN") "$Label encaminhou para Suporte Site"
  Assert-True ([string]$thread.currentOwnerType -eq "SUPER_ADMIN") "$Label mudou dono atual para SUPER_ADMIN"
  return $thread
}

function Resolve-Thread {
  param(
    [hashtable] $Session,
    [string] $ThreadId,
    [string] $Response,
    [string] $Label
  )

  $thread = Invoke-Api -Method "POST" -Path "/support/linked/$ThreadId/resolve" -Token $Session.token -Body @{
    response = $Response
    status = "RESOLVED"
    targetType = "ALL"
  }

  Assert-True ([string]$thread.status -eq "RESOLVED") "$Label resolveu chamado"
  Assert-True ((Message-Count $thread) -ge 1) "$Label registrou solucao nas mensagens"
  return $thread
}

function List-Scope {
  param(
    [hashtable] $Session,
    [string] $Scope,
    [string] $Label
  )

  $threads = Invoke-Api -Method "GET" -Path "/support/linked/$Scope" -Token $Session.token

  if ($null -eq $threads) {
    $threads = @()
  }

  $items = @($threads)
  Pass "$Label listou fila $Scope com $($items.Count) chamado(s)"
  return $items
}

Log "[INFO] Teste REAL da API de suporte"
Log "[INFO] BaseUrl: $BaseUrl"
Log "[INFO] Relatorio: $ReportPath"
Log ""

try {
  try {
    $health = Invoke-RestMethod -Method GET -Uri "$BaseUrl" -TimeoutSec 4
    Pass "API respondeu em $BaseUrl"
  } catch {
    Warn "Nao consegui validar GET $BaseUrl. Vou tentar os endpoints mesmo assim."
  }

  if ([string]::IsNullOrWhiteSpace($EventId)) {
    $EventId = Read-Host "ID de um evento real para testar suporte"
  }

  if ([string]::IsNullOrWhiteSpace($EventName)) {
    $EventName = Read-Host "Nome do evento para aparecer no relatorio"
  }

  if ([string]::IsNullOrWhiteSpace($EventId)) {
    throw "EventId e obrigatorio para testar a regra de suporte por evento."
  }

  if ([string]::IsNullOrWhiteSpace($EventName)) {
    $EventName = "Evento teste real"
  }

  Log "[INFO] Evento usado: $EventName / $EventId"

  $customerCred = Read-CredentialPair -RoleName "CUSTOMER" -Required $false
  $adminCred = Read-CredentialPair -RoleName "PRODUTOR/ADMIN" -Required $true
  $operatorCred = Read-CredentialPair -RoleName "OPERATOR" -Required $false
  $superCred = Read-CredentialPair -RoleName "SUPER_ADMIN / SUPORTE SITE" -Required $true

  $customer = Login -RoleLabel "CUSTOMER" -Credential $customerCred
  $admin = Login -RoleLabel "PRODUTOR/ADMIN" -Credential $adminCred
  $operator = Login -RoleLabel "OPERATOR" -Credential $operatorCred
  $super = Login -RoleLabel "SUPER_ADMIN" -Credential $superCred

  Log ""
  Log "============================================================"
  Log "[FLUXO 1] Produtor abre, responde, encaminha, Suporte Site responde e resolve"
  Log "============================================================"

  $adminThread = Create-LinkedThread -Session $admin -Label "Produtor" -Body @{
    eventId = $EventId
    title = "Teste real produtor para suporte site $Stamp"
    message = "Mensagem inicial real criada pelo produtor/admin."
    category = "Atendimento"
    priority = "NORMAL"
    sourceType = "PRODUCER"
    currentOwnerType = "PRODUCER"
    targetType = "ALL"
    producerName = $admin.user.name
    producerEmail = $admin.user.email
  }

  $adminList = List-Scope -Session $admin -Scope "admin" -Label "Produtor"
  Assert-True ([bool](Find-Thread -Threads $adminList -ThreadId $adminThread.id)) "Fila do produtor encontrou o chamado criado"

  $adminThread = Add-Message -Session $admin -ThreadId $adminThread.id -Message "Resposta real do produtor para todos os envolvidos." -Label "Produtor"
  $adminThread = Forward-Super -Session $admin -ThreadId $adminThread.id -Reason "Encaminhamento real: validar fila do Suporte Site." -Label "Produtor"

  $superList = List-Scope -Session $super -Scope "super" -Label "Suporte Site"
  Assert-True ([bool](Find-Thread -Threads $superList -ThreadId $adminThread.id)) "Fila do Suporte Site recebeu chamado do produtor"

  $adminThread = Add-Message -Session $super -ThreadId $adminThread.id -Message "Resposta real do Suporte Site para todos." -Label "Suporte Site"
  $adminThread = Resolve-Thread -Session $super -ThreadId $adminThread.id -Response "Resolvido no teste real pelo Suporte Site." -Label "Suporte Site"

  Log ""
  Log "============================================================"
  Log "[FLUXO 2] Operador abre chamado tecnico do evento e encaminha"
  Log "============================================================"

  if ($operator) {
    $operatorThread = Create-LinkedThread -Session $operator -Label "Operador" -Body @{
      eventId = $EventId
      title = "Teste real operador tecnico $Stamp"
      message = "Problema real informado pelo operador no evento."
      category = "Suporte tecnico"
      priority = "NORMAL"
      sourceType = "OPERATOR"
      currentOwnerType = "OPERATOR"
      targetType = "ALL"
      operatorName = $operator.user.name
      operatorEmail = $operator.user.email
    }

    $operatorList = List-Scope -Session $operator -Scope "operator" -Label "Operador"
    Assert-True ([bool](Find-Thread -Threads $operatorList -ThreadId $operatorThread.id)) "Fila do operador encontrou somente chamado dele/evento"

    $operatorThread = Add-Message -Session $operator -ThreadId $operatorThread.id -Message "Mensagem real do operador antes de encaminhar." -Label "Operador"
    $operatorThread = Forward-Super -Session $operator -ThreadId $operatorThread.id -Reason "Encaminhamento real do operador para suporte tecnico." -Label "Operador"

    $superList2 = List-Scope -Session $super -Scope "super" -Label "Suporte Site"
    Assert-True ([bool](Find-Thread -Threads $superList2 -ThreadId $operatorThread.id)) "Fila do Suporte Site recebeu chamado do operador"

    $operatorThread = Resolve-Thread -Session $super -ThreadId $operatorThread.id -Response "Chamado tecnico do operador resolvido no teste real." -Label "Suporte Site"
  } else {
    Warn "Fluxo do operador pulado porque as credenciais OPERATOR nao foram informadas."
  }

  Log ""
  Log "============================================================"
  Log "[FLUXO 3] Cliente cria suporte de pedido, se houver credencial CUSTOMER"
  Log "============================================================"

  if ($customer) {
    Warn "Fluxo customer exige orderId real do cliente. Vou pedir um orderId; pressione Enter para pular."
    $orderId = Read-Host "OrderId real do customer"
    if (![string]::IsNullOrWhiteSpace($orderId)) {
      $customerThread = Invoke-Api -Method "POST" -Path "/support/customer" -Token $customer.token -Body @{
        orderId = $orderId
        subject = "Teste real customer $Stamp"
        message = "Mensagem real do customer para o produtor."
      }

      Assert-True ([bool]$customerThread.id) "Customer criou suporte vinculado ao pedido"
      Assert-True ((Message-Count $customerThread) -ge 1) "Customer criou mensagem inicial"
    } else {
      Warn "Fluxo customer pulado por falta de orderId."
    }
  } else {
    Warn "Fluxo customer pulado porque as credenciais CUSTOMER nao foram informadas."
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
  throw "Teste real da API de suporte terminou com $Failed falha(s). Veja: $ReportPath"
}
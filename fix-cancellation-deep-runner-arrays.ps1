$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
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

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Blindando arrays/listas do runner de cancelamento aprofundado"

if (!(Test-Path -LiteralPath $RunnerPath)) {
  throw "Nao encontrei o runner: $RunnerPath"
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupPath = "$RunnerPath.bak-fix-arrays-$Stamp"
Copy-Item -LiteralPath $RunnerPath -Destination $BackupPath -Force
Write-Host "[OK] Backup criado: $BackupPath"

$Text = [System.IO.File]::ReadAllText($RunnerPath)
$Original = $Text

# Funcoes auxiliares para evitar erro do PowerShell 5.1 quando um array com 1 item vira objeto solto.
$Helpers = @'

function As-List {
  param($Value)

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [System.Array]) {
    return @($Value)
  }

  return @($Value)
}

function First-Item {
  param($Value)

  $list = As-List $Value

  if ($list.Count -le 0) {
    return $null
  }

  return $list[0]
}

function Count-List {
  param($Value)

  return (As-List $Value).Count
}

'@

if ($Text -notmatch 'function As-List') {
  $Text = $Text.Replace('function To-Array {', $Helpers + 'function To-Array {')
  Write-Host "[OK] Helpers As-List/First-Item/Count-List inseridos."
} else {
  Write-Host "[OK] Helpers de lista ja existem."
}

# Corrige retornos que podem achatar arrays de 1 item.
$Text = $Text.Replace('return @($result)', 'return ,@($result)')
$Text = $Text.Replace('return @($Value)', 'return ,@($Value)')

# Corrige pontos onde usamos .Count direto em retorno possivelmente achatado.
$Text = $Text.Replace('$tickets.Count -eq $Quantity', '(Count-List $tickets) -eq $Quantity')
$Text = $Text.Replace('$tickets.Count', '(Count-List $tickets)')
$Text = $Text.Replace('$partialTickets = $partialCreated.tickets', '$partialTickets = As-List $partialCreated.tickets')
$Text = $Text.Replace('$partialTicketCancel = $partialTickets[0]', '$partialTicketCancel = First-Item $partialTickets')
$Text = $Text.Replace('$partialTicketKeep = $partialTickets[1]', '$partialTicketKeep = (As-List $partialTickets)[1]')

# Corrige acessos diretos [0] depois de propriedades hashtable/PSCustomObject que podem virar objeto solto.
$Text = $Text.Replace('$walletTicket = $walletCreated.tickets[0]', '$walletTicket = First-Item $walletCreated.tickets')
$Text = $Text.Replace('$bankTicket = $bankCreated.tickets[0]', '$bankTicket = First-Item $bankCreated.tickets')
$Text = $Text.Replace('$usedTicket = $usedCreated.tickets[0]', '$usedTicket = First-Item $usedCreated.tickets')
$Text = $Text.Replace('$transferTicket = $transferCreated.tickets[0]', '$transferTicket = First-Item $transferCreated.tickets')

# Corrige pipelines com Count direto.
$Text = $Text.Replace('($tickets | Where-Object { [string]$_.status -eq "AVAILABLE" }).Count -eq $Quantity', '(Count-List ($tickets | Where-Object { [string]$_.status -eq "AVAILABLE" })) -eq $Quantity')
$Text = $Text.Replace('($partialAllTickets | Where-Object { [string]$_.status -eq "CANCELED" }).Count', '(Count-List ($partialAllTickets | Where-Object { [string]$_.status -eq "CANCELED" }))')
$Text = $Text.Replace('($partialAllTickets | Where-Object { [string]$_.status -eq "AVAILABLE" }).Count', '(Count-List ($partialAllTickets | Where-Object { [string]$_.status -eq "AVAILABLE" }))')

# Adiciona log defensivo na funcao Create-PaidOrderWithTickets para facilitar se o erro continuar.
if ($Text -notmatch 'Pedido pago retornado apos finalizar') {
  $Text = $Text.Replace(
    '$paidOrder = Invoke-Api -Method "GET" -Path "/orders/customer/$($order.id)" -Token $Customer.token',
    '$paidOrder = Invoke-Api -Method "GET" -Path "/orders/customer/$($order.id)" -Token $Customer.token' + "`r`n" +
    '  Log "[INFO] Pedido pago retornado apos finalizar: $($paidOrder.id) / status=$($paidOrder.status)"'
  )
  Write-Host "[OK] Log defensivo apos buscar pedido pago inserido."
}

if ($Text -eq $Original) {
  Write-Host "[AVISO] Nenhuma substituicao foi aplicada. Talvez o runner ja esteja diferente." -ForegroundColor Yellow
}

Write-Utf8NoBom -Path $RunnerPath -Content $Text

$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile($RunnerPath, [ref]$tokens, [ref]$errors) | Out-Null

if ($errors -and $errors.Count -gt 0) {
  Write-Host "[ERRO] Ainda existem erros de sintaxe:" -ForegroundColor Red
  foreach ($err in $errors) {
    Write-Host " - Linha $($err.Extent.StartLineNumber): $($err.Message)" -ForegroundColor Red
  }
  throw "run-cancellation-deep-real-api-tests.ps1 ainda tem erro de sintaxe."
}

Write-Host "[OK] Sintaxe PowerShell validada."

Write-Host ""
Write-Host "[OK] Runner blindado."
Write-Host ""
Write-Host "Agora rode novamente:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-cancellation-deep-real-api-tests.ps1"

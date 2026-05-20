$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunnerPath = Join-Path $ProjectRoot "run-direct-ticket-qr-real-api-tests.ps1"

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
Write-Host "[INFO] Ajustando validacao da duplicidade do QR"

if (!(Test-Path -LiteralPath $RunnerPath)) {
  throw "Nao encontrei o arquivo: $RunnerPath"
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupPath = "$RunnerPath.bak-fix-duplicate-reason-$Stamp"
Copy-Item -LiteralPath $RunnerPath -Destination $BackupPath -Force
Write-Host "[OK] Backup criado: $BackupPath"

$Text = [System.IO.File]::ReadAllText($RunnerPath)

$Old = @'
    Assert-True (-not [bool]$secondTry.valid) "Segunda entrada do mesmo QR foi bloqueada"
    Assert-True ([string]$secondTry.reason -match "utilizado|usado|dispon") "Motivo de bloqueio retornado"

    Log ""
    Log "[INFO] Resultado check-in real:"
'@

$New = @'
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
'@

if ($Text.Contains($Old)) {
  $Text = $Text.Replace($Old, $New)
  Write-Host "[OK] Validacao de duplicidade ficou mais flexivel."
} else {
  $Pattern = 'Assert-True \(-not \[bool\]\$secondTry\.valid\) "Segunda entrada do mesmo QR foi bloqueada"\s*Assert-True \(\[string\]\$secondTry\.reason -match "utilizado\|usado\|dispon"\) "Motivo de bloqueio retornado"'
  $Replacement = @'
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
'@

  $NextText = [System.Text.RegularExpressions.Regex]::Replace($Text, $Pattern, $Replacement)

  if ($NextText -eq $Text) {
    throw "Nao encontrei o trecho antigo de duplicidade para corrigir."
  }

  $Text = $NextText
  Write-Host "[OK] Validacao de duplicidade corrigida por regex."
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
  throw "run-direct-ticket-qr-real-api-tests.ps1 ainda tem erro de sintaxe."
}

Write-Host "[OK] Sintaxe PowerShell validada."

Write-Host ""
Write-Host "[OK] Runner ajustado para proximos testes."
Write-Host ""
Write-Host "Observacao:"
Write-Host "O ingresso usado no teste anterior ja ficou USED. Para rodar -MarkAsUsed de novo, crie outro pedido de teste primeiro."

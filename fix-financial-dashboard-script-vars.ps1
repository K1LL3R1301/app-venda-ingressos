$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ScriptPath = Join-Path $ProjectRoot "create-financial-dashboard-real-api-tests.ps1"

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
Write-Host "[INFO] Corrigindo variaveis do criador do dashboard financeiro"

if (!(Test-Path -LiteralPath $ScriptPath)) {
  throw "Nao encontrei o script: $ScriptPath"
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupPath = "$ScriptPath.bak-fix-runner-vars-$Stamp"
Copy-Item -LiteralPath $ScriptPath -Destination $BackupPath -Force
Write-Host "[OK] Backup criado: $BackupPath"

$Text = [System.IO.File]::ReadAllText($ScriptPath)

$Text = $Text.Replace('$JsRunnerPath', '$JsPath')
$Text = $Text.Replace('$PsRunnerPath', '$PsPath')

Write-Utf8NoBom -Path $ScriptPath -Content $Text

$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile($ScriptPath, [ref]$tokens, [ref]$errors) | Out-Null

if ($errors -and $errors.Count -gt 0) {
  Write-Host "[ERRO] Ainda existem erros de sintaxe:" -ForegroundColor Red
  foreach ($err in $errors) {
    Write-Host " - Linha $($err.Extent.StartLineNumber): $($err.Message)" -ForegroundColor Red
  }
  throw "create-financial-dashboard-real-api-tests.ps1 ainda tem erro de sintaxe."
}

Write-Host "[OK] Variaveis corrigidas e sintaxe validada."
Write-Host ""
Write-Host "Agora rode novamente:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\create-financial-dashboard-real-api-tests.ps1"

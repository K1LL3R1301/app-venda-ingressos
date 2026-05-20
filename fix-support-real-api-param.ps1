$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunnerPath = Join-Path $ProjectRoot "run-support-real-api-tests.ps1"

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
Write-Host "[INFO] Corrigindo param() do run-support-real-api-tests.ps1"

if (!(Test-Path -LiteralPath $RunnerPath)) {
  throw "Nao encontrei o arquivo: $RunnerPath"
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupPath = "$RunnerPath.bak-fix-param-$Stamp"
Copy-Item -LiteralPath $RunnerPath -Destination $BackupPath -Force
Write-Host "[OK] Backup criado: $BackupPath"

$Text = [System.IO.File]::ReadAllText($RunnerPath)

# No PowerShell, param(...) precisa ser o primeiro bloco executavel do arquivo.
# O script anterior tinha $ErrorActionPreference antes do param, causando ParserError.
$Text = [System.Text.RegularExpressions.Regex]::Replace(
  $Text,
  '^\s*\$ErrorActionPreference\s*=\s*"Stop"\s*\r?\n\s*\r?\n\s*param\s*\(',
  'param('
)

# Se o arquivo nao tinha mais $ErrorActionPreference depois do param, adiciona logo depois do bloco param.
if ($Text -notmatch '\$ErrorActionPreference\s*=\s*"Stop"') {
  $Text = [System.Text.RegularExpressions.Regex]::Replace(
    $Text,
    '(?ms)^(param\s*\(.*?\)\s*)',
    "`$1`r`n`$ErrorActionPreference = `"Stop`"`r`n"
  )
}

# Se o regex acima nao conseguiu inserir, faz uma correcao mais especifica para o bloco conhecido.
if ($Text -notmatch '\$ErrorActionPreference\s*=\s*"Stop"') {
  $Text = $Text.Replace(
    '[string] $EventName = ""
)',
    '[string] $EventName = ""
)

$ErrorActionPreference = "Stop"'
  )
}

Write-Utf8NoBom -Path $RunnerPath -Content $Text

$Fixed = [System.IO.File]::ReadAllText($RunnerPath)
$FirstLines = ($Fixed -split "`r?`n" | Select-Object -First 8) -join "`n"

Write-Host "[INFO] Primeiras linhas atuais:"
Write-Host $FirstLines

if ($FirstLines -notmatch '^\s*param\s*\(') {
  throw "Ainda nao ficou certo: o arquivo precisa comecar com param(...)."
}

Write-Host ""
Write-Host "[OK] Param corrigido."
Write-Host ""
Write-Host "Agora rode novamente:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-support-real-api-tests.ps1"

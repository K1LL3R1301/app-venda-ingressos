$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$GitIgnorePath = Join-Path $ProjectRoot ".gitignore"

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

function Add-GitIgnoreLines {
  param([string[]] $Lines)

  $Current = ""
  if (Test-Path -LiteralPath $GitIgnorePath) {
    $Current = [System.IO.File]::ReadAllText($GitIgnorePath)
  }

  $NewLines = New-Object System.Collections.Generic.List[string]

  foreach ($Line in $Lines) {
    if ($Current -notmatch [System.Text.RegularExpressions.Regex]::Escape($Line)) {
      $NewLines.Add($Line)
    }
  }

  if ($NewLines.Count -gt 0) {
    $Next = $Current.TrimEnd() + "`r`n`r`n# Arquivos locais gerados por testes/scripts`r`n" + ($NewLines -join "`r`n") + "`r`n"
    Write-Utf8NoBom -Path $GitIgnorePath -Content $Next
    Write-Host "[OK] .gitignore atualizado."
  } else {
    Write-Host "[OK] .gitignore ja tinha as regras principais."
  }
}

function Remove-PathSafe {
  param([string] $Path)

  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
    Write-Host "[OK] Removido: $Path"
    return 1
  }

  return 0
}

function Remove-GlobFiles {
  param([string] $Pattern)

  $Files = Get-ChildItem -Path $ProjectRoot -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -like $Pattern }

  $Count = 0
  foreach ($File in $Files) {
    try {
      Remove-Item -LiteralPath $File.FullName -Force
      Write-Host "[OK] Removido arquivo: $($File.FullName)"
      $Count++
    } catch {
      Write-Host "[AVISO] Nao removi: $($File.FullName) - $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }

  return $Count
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Limpando backups, logs e artefatos de teste que foram commitados sem necessidade"

if (!(Test-Path -LiteralPath (Join-Path $ProjectRoot ".git"))) {
  throw "Este script precisa ser rodado na raiz do repositorio Git."
}

$IgnoreLines = @(
  "*.bak-*",
  "*.bak",
  "*.tmp",
  "apps/**/log-*.txt",
  "apps/web/test-results/",
  "apps/web/playwright-report/",
  "apps/web/blob-report/",
  "test-results/",
  "playwright-report/"
)

Add-GitIgnoreLines -Lines $IgnoreLines

$Removed = 0

# Backups criados pelos patches.
$Removed += Remove-GlobFiles -Pattern (Join-Path $ProjectRoot "*.bak*")
$Removed += Remove-GlobFiles -Pattern (Join-Path $ProjectRoot "apps\*.bak*")
$Removed += Remove-GlobFiles -Pattern (Join-Path $ProjectRoot "apps\*\*.bak*")
$Removed += Remove-GlobFiles -Pattern (Join-Path $ProjectRoot "apps\*\*\*.bak*")
$Removed += Remove-GlobFiles -Pattern (Join-Path $ProjectRoot "apps\*\*\*\*.bak*")
$Removed += Remove-GlobFiles -Pattern (Join-Path $ProjectRoot "apps\*\*\*\*\*.bak*")
$Removed += Remove-GlobFiles -Pattern (Join-Path $ProjectRoot "apps\*\*\*\*\*\*.bak*")

# Logs de build e execucao.
$Removed += Remove-GlobFiles -Pattern (Join-Path $ProjectRoot "apps\api\log-*.txt")
$Removed += Remove-GlobFiles -Pattern (Join-Path $ProjectRoot "apps\web\log-*.txt")

# Artefatos pesados/temporarios de testes visuais.
$Removed += Remove-PathSafe -Path (Join-Path $ProjectRoot "apps\web\test-results")
$Removed += Remove-PathSafe -Path (Join-Path $ProjectRoot "apps\web\playwright-report")
$Removed += Remove-PathSafe -Path (Join-Path $ProjectRoot "apps\web\blob-report")

# Scripts de patch one-shot. Mantemos apenas runners uteis de teste.
$OneShotScripts = @(
  "create-support-guided-visual-tests.ps1",
  "create-support-walkthrough-no-playwright-runner.ps1",
  "fix-operator-support-hydration-v2.ps1",
  "fix-operator-support-strict-event.ps1",
  "fix-support-chat-final-behavior.ps1",
  "fix-support-guided-chromium-project.ps1",
  "fix-support-guided-no-hang-runner.ps1",
  "remove-super-support-return-buttons.ps1",
  "upgrade-admin-support-agenda-whatsapp.ps1",
  "upgrade-operator-support-new-event-select.ps1",
  "upgrade-super-support-agenda-whatsapp.ps1"
)

foreach ($ScriptName in $OneShotScripts) {
  $Removed += Remove-PathSafe -Path (Join-Path $ProjectRoot $ScriptName)
}

# Backups de runners antigos.
$Removed += Remove-GlobFiles -Pattern (Join-Path $ProjectRoot "run-support-guided-visual-tests*.bak*")
$Removed += Remove-GlobFiles -Pattern (Join-Path $ProjectRoot "run-support-guided-visual-tests-debug*.bak*")

Write-Host ""
Write-Host "[OK] Limpeza concluida."
Write-Host "[INFO] Itens removidos: $Removed"
Write-Host ""
Write-Host "Agora confira:"
Write-Host "git status --short"
Write-Host ""
Write-Host "Depois rode build rapido:"
Write-Host "cd `"$ProjectRoot\apps\web`""
Write-Host "npm run build *> log-web-cleanup-build.txt"
Write-Host "Select-String -Path .\log-web-cleanup-build.txt -Pattern `"error|Error:|Failed|Cannot find|Type error|Module not found`" -Context 2,3"
Write-Host ""
Write-Host "Se o build passar, commite a limpeza:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "git add -A"
Write-Host "git commit -m `"Limpa artefatos locais e ignora backups de testes`""
Write-Host "git push"

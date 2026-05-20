$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$RunnerPath = Join-Path $ProjectRoot "run-support-visual-tests.ps1"
$SpecPath = Join-Path $WebRoot "tests\support-linked-flow.visual.spec.ts"

function Write-Utf8NoBom {
  param(
    [string] $Path,
    [string] $LiteralPath,
    [AllowEmptyString()][string] $Content
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    $Path = $LiteralPath
  }

  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Caminho nao informado para Write-Utf8NoBom."
  }

  $Dir = [System.IO.Path]::GetDirectoryName($Path)
  if (![string]::IsNullOrWhiteSpace($Dir) -and ![System.IO.Directory]::Exists($Dir)) {
    [System.IO.Directory]::CreateDirectory($Dir) | Out-Null
  }

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Recriando run-support-visual-tests.ps1"

if (!(Test-Path -LiteralPath $WebRoot)) {
  throw "Pasta da WEB nao encontrada: $WebRoot"
}

if (!(Test-Path -LiteralPath $SpecPath)) {
  Write-Host "[AVISO] Arquivo de teste visual nao encontrado:" -ForegroundColor Yellow
  Write-Host "        $SpecPath" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Rode primeiro o script que cria os testes visuais:"
  Write-Host "powershell -ExecutionPolicy Bypass -File .\create-support-visual-tests-v2.ps1"
  throw "Testes visuais ainda nao existem neste projeto."
}

$RunnerContent = @'
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Rodando testes visuais do suporte interligado"

Set-Location $WebRoot

if (!(Test-Path -LiteralPath (Join-Path $WebRoot "node_modules\@playwright\test"))) {
  Write-Host "[INFO] Instalando @playwright/test..."
  npm install -D @playwright/test
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao instalar @playwright/test."
  }
} else {
  Write-Host "[OK] @playwright/test ja instalado."
}

Write-Host "[INFO] Conferindo navegador Chromium do Playwright..."
npx playwright install chromium
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao instalar/conferir navegador Chromium do Playwright."
}

Write-Host "[INFO] Executando teste visual em modo headed..."
npx playwright test tests/support-linked-flow.visual.spec.ts --headed --project=chromium
if ($LASTEXITCODE -ne 0) {
  throw "Testes visuais falharam. Abra o relatorio ou veja os screenshots em apps\web\test-results."
}

Write-Host ""
Write-Host "[OK] Testes visuais finalizados."
Write-Host "Screenshots salvos em:"
Write-Host "  $WebRoot\test-results\support-flow-visual"
Write-Host ""
Write-Host "Relatorio HTML, se quiser abrir:"
Write-Host "  cd `"$WebRoot`""
Write-Host "  npx playwright show-report"
'@

Write-Utf8NoBom -Path $RunnerPath -Content $RunnerContent

Write-Host "[OK] Runner recriado:"
Write-Host "     $RunnerPath"
Write-Host ""
Write-Host "Agora rode:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-support-visual-tests.ps1"

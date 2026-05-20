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
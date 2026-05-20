$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"

Write-Host "[INFO] Modo debug: o Playwright Inspector vai abrir."
Write-Host "[INFO] Use Resume/Step Over para acompanhar acao por acao."

Set-Location $WebRoot

if (!(Test-Path -LiteralPath ".\node_modules\@playwright\test")) {
  npm install -D @playwright/test
  if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar @playwright/test." }
}

npx playwright install chromium
if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar/conferir Chromium do Playwright." }

npx playwright test tests/support-all-roles-guided.visual.spec.ts --config=playwright.support-guided.config.ts --debug --project=chromium
if ($LASTEXITCODE -ne 0) { throw "Teste debug falhou ou foi interrompido." }
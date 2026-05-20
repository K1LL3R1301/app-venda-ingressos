$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"

Set-Location $WebRoot

Write-Host "[INFO] Rodando somente a listagem dos testes, sem abrir navegador..."
npx playwright test tests/support-all-roles-guided.visual.spec.ts --config=playwright.support-guided.config.ts --project=chromium --list
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao listar testes."
}
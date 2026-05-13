# aplicar-v58e-corrigir-clean-typescript.ps1
# Corrige erro TS2345 em admin-access-requests.service.ts:
# Argument of type 'string | boolean | undefined' is not assignable to parameter of type 'string | null | undefined'.
#
# A correcao altera a funcao clean para aceitar unknown com seguranca.
# Rode na raiz do projeto plataforma-ingressos.

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$ServicePath = Join-Path $Root "apps\api\src\admin-access-requests\admin-access-requests.service.ts"

if (-not (Test-Path $ServicePath)) {
  throw "Arquivo nao encontrado: apps\api\src\admin-access-requests\admin-access-requests.service.ts"
}

$Content = Get-Content $ServicePath -Raw

$Backup = "$ServicePath.bak-v58e-$Stamp"
Copy-Item $ServicePath $Backup -Force
Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray

$Old = @'
function clean(value?: string | null) {
  return String(value || '').trim();
}
'@

$New = @'
function clean(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : '';
  return String(value).trim();
}
'@

if ($Content -notlike "*function clean(value?: string | null)*") {
  Write-Host "Assinatura antiga nao encontrada. Tentando patch alternativo..." -ForegroundColor Yellow

  $Content = $Content -replace "function clean\(value\?: string \| null\)\s*\{\s*return String\(value \|\| ''\)\.trim\(\);\s*\}", $New

  if ($Content -notlike "*function clean(value: unknown)*") {
    throw "Nao consegui aplicar o patch automaticamente. Me mande o arquivo admin-access-requests.service.ts."
  }
} else {
  $Content = $Content.Replace($Old, $New)
}

Set-Content -Path $ServicePath -Value $Content -Encoding UTF8

Write-Host "Corrigido: admin-access-requests.service.ts" -ForegroundColor Green
Write-Host ""
Write-Host "Agora reinicie a API:" -ForegroundColor Cyan
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\api"' -ForegroundColor Cyan
Write-Host "npm run start:dev" -ForegroundColor Cyan

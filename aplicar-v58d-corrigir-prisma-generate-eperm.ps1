# aplicar-v58d-corrigir-prisma-generate-eperm.ps1
# Corrige o erro EPERM do Prisma no Windows:
# query_engine-windows.dll.node.tmp -> query_engine-windows.dll.node
#
# Causa comum:
# API/WEB/VS Code/Node segurando o arquivo do Prisma Client aberto.
#
# Este script:
# 1. Para processos node.exe para soltar o arquivo travado.
# 2. Limpa arquivos temporarios do Prisma Client.
# 3. Roda npx prisma generate novamente.
# 4. NAO roda db push de novo.

$ErrorActionPreference = "Stop"

$Root = Get-Location
$ApiPath = Join-Path $Root "apps\api"

if (-not (Test-Path $ApiPath)) {
  throw "Pasta apps\api nao encontrada. Rode este script na raiz do projeto plataforma-ingressos."
}

Write-Host "Aplicando v58d - corrigir Prisma generate EPERM..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Parando processos node.exe para liberar o Prisma Client..." -ForegroundColor Yellow

Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
  try {
    Write-Host "Parando node PID $($_.Id)..." -ForegroundColor DarkGray
    Stop-Process -Id $_.Id -Force -ErrorAction Stop
  } catch {
    Write-Host "Nao consegui parar node PID $($_.Id): $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

Start-Sleep -Seconds 2

$PrismaClientDir = Join-Path $ApiPath "node_modules\.prisma\client"

if (Test-Path $PrismaClientDir) {
  Write-Host "Limpando arquivos temporarios do Prisma Client..." -ForegroundColor Cyan

  Get-ChildItem $PrismaClientDir -Filter "*.tmp*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
  Get-ChildItem $PrismaClientDir -Filter "query_engine-windows.dll.node.tmp*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
}

Push-Location $ApiPath

try {
  Write-Host ""
  Write-Host "Rodando: npx prisma generate" -ForegroundColor Cyan
  npx prisma generate

  if ($LASTEXITCODE -ne 0) {
    throw "npx prisma generate falhou novamente."
  }
}
finally {
  Pop-Location
}

Write-Host ""
Write-Host "Prisma Client gerado com sucesso." -ForegroundColor Green
Write-Host ""
Write-Host "Agora reinicie a API e o WEB:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Terminal API:" -ForegroundColor Yellow
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\api"' -ForegroundColor Cyan
Write-Host "npm run start:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Terminal WEB:" -ForegroundColor Yellow
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\web"' -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Depois teste:" -ForegroundColor Cyan
Write-Host "- /support/admin-request" -ForegroundColor Cyan
Write-Host "- /admin/support/admin-requests" -ForegroundColor Cyan

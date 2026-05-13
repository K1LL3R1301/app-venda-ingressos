# aplicar-v48-astro-logo-dashboard-video.ps1
# Rode na raiz do projeto plataforma-ingressos

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$Files = @(
  @{
    Source = "apps\web\src\components\customer\CustomerHeader.tsx"
    Target = "apps\web\src\components\customer\CustomerHeader.tsx"
  },
  @{
    Source = "apps\web\src\app\(customer)\layout.tsx"
    Target = "apps\web\src\app\(customer)\layout.tsx"
  },
  @{
    Source = "apps\web\src\app\(customer)\dashboard\page.tsx"
    Target = "apps\web\src\app\(customer)\dashboard\page.tsx"
  },
  @{
    Source = "apps\web\public\astro-ingressos-logo.png"
    Target = "apps\web\public\astro-ingressos-logo.png"
  }
)

foreach ($File in $Files) {
  $Source = Join-Path $PSScriptRoot $File.Source
  $Target = Join-Path $Root $File.Target

  if (-not (Test-Path $Source)) {
    throw "Arquivo fonte nao encontrado: $Source"
  }

  $TargetDir = Split-Path $Target -Parent

  if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
  }

  if (Test-Path $Target) {
    $Backup = "$Target.bak-v48-$Stamp"
    Copy-Item $Target $Backup -Force
    Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray
  }

  Copy-Item $Source $Target -Force
  Write-Host "Atualizado: $($File.Target)" -ForegroundColor Green
}

Write-Host ""
Write-Host "v48 aplicada com sucesso." -ForegroundColor Green
Write-Host "Agora reinicie o web: cd apps\web ; npm run dev" -ForegroundColor Cyan

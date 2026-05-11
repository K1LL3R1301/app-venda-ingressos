$ErrorActionPreference = "Stop"

$root = "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos"
$pagePath = Join-Path $root "apps\web\src\app\(customer)\orders\[id]\page.tsx"

if (-not (Test-Path -LiteralPath $pagePath)) {
  Write-Host "[ERRO] Arquivo nao encontrado:" $pagePath -ForegroundColor Red
  exit 1
}

$content = Get-Content -LiteralPath $pagePath -Raw -Encoding UTF8

$backupPath = "$pagePath.bak-normalizeText-fix-$(Get-Date -Format yyyyMMddHHmmss)"
Copy-Item -LiteralPath $pagePath -Destination $backupPath -Force

# Troca todas as chamadas antigas por uma funcao nova e segura.
$content = $content.Replace("normalizeText(", "normalizeOrderTicketTextSafe(")

$helper = @'
function normalizeOrderTicketTextSafe(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

'@

if ($content -notmatch "function\s+normalizeOrderTicketTextSafe\s*\(") {
  $marker = "function summarizeTicketBreakdown"
  $markerIndex = $content.IndexOf($marker)

  if ($markerIndex -lt 0) {
    Write-Host "[ERRO] Nao encontrei function summarizeTicketBreakdown no arquivo." -ForegroundColor Red
    Write-Host "Backup criado em: $backupPath" -ForegroundColor Yellow
    exit 1
  }

  $content = $content.Insert($markerIndex, $helper)
}

Set-Content -LiteralPath $pagePath -Value $content -Encoding UTF8

Write-Host "[OK] Corrigido normalizeText em:" $pagePath -ForegroundColor Green
Write-Host "[OK] Backup:" $backupPath -ForegroundColor Green
Write-Host ""
Write-Host "Agora rode:" -ForegroundColor Cyan
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\web"'
Write-Host 'Remove-Item -Recurse -Force .next'
Write-Host 'npm run dev'

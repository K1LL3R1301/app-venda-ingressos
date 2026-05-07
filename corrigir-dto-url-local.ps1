$Path = "apps/api/src/events/dto/create-event.dto.ts"

if (!(Test-Path $Path)) {
  Write-Error "Arquivo nao encontrado: $Path"
  exit 1
}

$Backup = "$Path.bak-urls-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $Path $Backup

$Content = Get-Content $Path -Raw
$Content = $Content.Replace('@IsUrl()', '@IsUrl({ require_tld: false })')
Set-Content -Path $Path -Value $Content -Encoding UTF8

Write-Host "DTO ajustado. Backup criado em: $Backup"

$ErrorActionPreference = "Stop"

$root = Get-Location
$target = Get-ChildItem -LiteralPath ".\apps\web\src\app" -Recurse -File -Filter "page.tsx" |
  Where-Object { $_.FullName.EndsWith("\admin\events\[id]\page.tsx") } |
  Select-Object -First 1

if (-not $target) {
  Write-Host "[ERRO] Nao encontrei apps\web\src\app\admin\events\[id]\page.tsx"
  Write-Host "Pasta atual:" $root.Path
  exit 1
}

$content = Get-Content -LiteralPath $target.FullName -Raw

if ($content -match "/admin/events/\$\{eventId\}/edit") {
  Write-Host "[OK] Botao Editar evento ja existe em:" $target.FullName
  exit 0
}

if ($content -notmatch "const\s+eventId\s*=") {
  if ($content -match "const\s+params\s*=\s*useParams\(\)\s*;") {
    $content = $content -replace "const\s+params\s*=\s*useParams\(\)\s*;", "const params = useParams();`r`n  const eventId = String(params.id || """");"
    Write-Host "[OK] eventId criado a partir de params.id"
  } else {
    Write-Host "[ERRO] Nao encontrei const params = useParams(); para criar eventId."
    exit 1
  }
}

$button = @'
        <Link
          href={`/admin/events/${eventId}/edit`}
          className="fixed bottom-6 right-6 z-50 rounded-2xl bg-sky-600 px-5 py-4 text-sm font-black text-white shadow-2xl shadow-sky-600/30 transition hover:bg-sky-700"
        >
          Editar evento
        </Link>
'@

if ($content -match [regex]::Escape($button.Trim())) {
  Write-Host "[OK] Botao Editar evento ja estava inserido."
  exit 0
}

$pattern = '(<main\b[^>]*>)'
$replacement = '$1' + "`r`n" + $button

if ($content -match $pattern) {
  $content = [regex]::Replace($content, $pattern, $replacement, 1)
  Set-Content -LiteralPath $target.FullName -Value $content -Encoding UTF8
  Write-Host "[OK] Botao Editar evento inserido em:" $target.FullName
} else {
  Write-Host "[ERRO] Nao encontrei a tag <main> para inserir o botao."
  exit 1
}

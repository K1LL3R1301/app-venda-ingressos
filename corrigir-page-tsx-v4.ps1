$ErrorActionPreference = "Stop"

# Patch apps/web/src/app/(customer)/events/[id]/page.tsx
# Run from the project root. If you run from apps/web or another subfolder,
# this script tries to walk upward until it finds the project.

function Find-ProjectRoot {
  param([string]$StartPath)

  $current = (Resolve-Path $StartPath).Path

  for ($i = 0; $i -lt 8; $i++) {
    $candidate = Join-Path $current "apps/web/src/app/(customer)/events/[id]/page.tsx"

    if ([System.IO.File]::Exists($candidate)) {
      return $current
    }

    $parent = Split-Path $current -Parent

    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $current) {
      break
    }

    $current = $parent
  }

  return $null
}

$root = Find-ProjectRoot -StartPath (Get-Location).Path

if (-not $root) {
  Write-Host "Project root not found."
  Write-Host "Run this script from the plataforma-ingressos folder or from a subfolder inside it."
  exit 1
}

$relative = "apps/web/src/app/(customer)/events/[id]/page.tsx"
$target = Join-Path $root $relative

Write-Host "Project root:"
Write-Host $root
Write-Host ""
Write-Host "Target file:"
Write-Host $target
Write-Host ""

$content = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
$original = $content

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$target.bak-$timestamp"
[System.IO.File]::Copy($target, $backup, $true)

Write-Host "Backup created:"
Write-Host $backup
Write-Host ""

$guardPattern = '(if\s*\(\s*!\s*sector\s*\|\|\s*!\s*object\s*\|\|\s*!\s*ticket\s*\|\|\s*!\s*session\s*\)\s*return\s+null\s*;\s*)'

if ($content -notmatch 'const\s+activeSessionId\s*=\s*session\.id\s*;') {
  $content = [System.Text.RegularExpressions.Regex]::Replace(
    $content,
    $guardPattern,
    "`$1`r`nconst activeSessionId = session.id;`r`nconst activeSectorId = sector.id;`r`n",
    1
  )
}

$content = [System.Text.RegularExpressions.Regex]::Replace(
  $content,
  'sessionId:\s*session\.id\s*,',
  'sessionId: activeSessionId,'
)

$content = [System.Text.RegularExpressions.Regex]::Replace(
  $content,
  'sectorId:\s*sector\.id\s*,',
  'sectorId: activeSectorId,'
)

if ($content -eq $original) {
  Write-Host "No automatic change was made."
  Write-Host ""
  Write-Host "Showing lines around 'sessionId: session.id' to help patch manually:"
  $lines = $content -split "`r?`n"
  $found = $false

  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'sessionId:\s*session\.id') {
      $found = $true
      Write-Host ""
      Write-Host "--- near line $($i + 1) ---"
      $start = [Math]::Max(0, $i - 12)
      $end = [Math]::Min($lines.Count - 1, $i + 12)

      for ($j = $start; $j -le $end; $j++) {
        "{0,5}: {1}" -f ($j + 1), $lines[$j]
      }
    }
  }

  if (-not $found) {
    Write-Host "No 'sessionId: session.id' occurrences found."
  }

  exit 2
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $content, $utf8NoBom)

Write-Host "Done. page.tsx was patched."
Write-Host ""
Write-Host "Occurrences after patch:"
Select-String -LiteralPath $target -Pattern "activeSessionId|activeSectorId|sessionId: session.id|sectorId: sector.id" | ForEach-Object {
  Write-Host ("Line {0}: {1}" -f $_.LineNumber, $_.Line.Trim())
}
Write-Host ""
Write-Host "Now run:"
Write-Host "cd apps/web"
Write-Host "npm run build"

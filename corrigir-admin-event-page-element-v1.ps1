$ErrorActionPreference = "Stop"

# Patch apps/web/src/app/admin/events/[id]/page.tsx
# Fixes: Type error: 'element' is possibly 'null' at element.getBoundingClientRect()

function Find-ProjectRoot {
  param([string]$StartPath)

  $current = (Resolve-Path $StartPath).Path

  for ($i = 0; $i -lt 8; $i++) {
    $candidate = Join-Path $current "apps/web/src/app/admin/events/[id]/page.tsx"

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

$relative = "apps/web/src/app/admin/events/[id]/page.tsx"
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

# Most likely current code:
# function updateWidth() {
#   const rect = element.getBoundingClientRect();
#
# Patch to:
# function updateWidth() {
#   if (!element) return;
#   const rect = element.getBoundingClientRect();

$pattern = '(function\s+updateWidth\s*\(\)\s*\{\s*)(const\s+rect\s*=\s*element\.getBoundingClientRect\(\)\s*;)'
$replacement = "`$1if (!element) return;`r`n      `$2"

$content = [System.Text.RegularExpressions.Regex]::Replace(
  $content,
  $pattern,
  $replacement,
  1
)

if ($content -eq $original) {
  Write-Host "Automatic patch was not applied."
  Write-Host ""
  Write-Host "Showing lines around 'getBoundingClientRect' to help patch manually:"
  $lines = $content -split "`r?`n"
  $found = $false

  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'getBoundingClientRect') {
      $found = $true
      Write-Host ""
      Write-Host "--- near line $($i + 1) ---"
      $start = [Math]::Max(0, $i - 10)
      $end = [Math]::Min($lines.Count - 1, $i + 10)

      for ($j = $start; $j -le $end; $j++) {
        "{0,5}: {1}" -f ($j + 1), $lines[$j]
      }
    }
  }

  if (-not $found) {
    Write-Host "No getBoundingClientRect occurrence found."
  }

  exit 2
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $content, $utf8NoBom)

Write-Host "Done. admin events page was patched."
Write-Host ""
Write-Host "Occurrences after patch:"
Select-String -LiteralPath $target -Pattern "function updateWidth|if \(!element\) return|getBoundingClientRect" | ForEach-Object {
  Write-Host ("Line {0}: {1}" -f $_.LineNumber, $_.Line.Trim())
}
Write-Host ""
Write-Host "Now run:"
Write-Host "cd apps/web"
Write-Host "npm run build"

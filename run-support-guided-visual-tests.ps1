$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$ReportDir = Join-Path $WebRoot "test-results\reports"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$TranscriptPath = Join-Path $ReportDir "support-guided-walkthrough-runner-$Stamp.txt"

New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

function Test-Url {
  param([string] $Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Start-WebIfNeeded {
  if (Test-Url "http://localhost:3000") {
    Write-Host "[OK] WEB ja esta respondendo em http://localhost:3000"
    return $null
  }

  Write-Host "[INFO] WEB nao esta respondendo. Vou subir npm run dev em processo separado..."
  $logPath = Join-Path $ReportDir "support-guided-walkthrough-webserver-$Stamp.txt"

  $process = Start-Process -FilePath "powershell" `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "cd `"$WebRoot`"; npm run dev *> `"$logPath`"" `
    -WindowStyle Minimized `
    -PassThru

  $deadline = (Get-Date).AddSeconds(90)

  while ((Get-Date) -lt $deadline) {
    if (Test-Url "http://localhost:3000") {
      Write-Host "[OK] WEB subiu em http://localhost:3000"
      return $process
    }

    Start-Sleep -Seconds 2
  }

  throw "A WEB nao subiu em 90 segundos. Veja o log: $logPath"
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Walkthrough visual guiado sem Playwright Test Runner"
Write-Host "[INFO] Este modo evita o erro clear output / apply rebaselines."
Write-Host "[INFO] Transcript: $TranscriptPath"

Start-Transcript -Path $TranscriptPath -Force | Out-Null

$webProcess = $null

try {
  Set-Location $WebRoot

  if (!(Test-Path -LiteralPath ".\node_modules\playwright")) {
    Write-Host "[INFO] Instalando Playwright..."
    npm install -D @playwright/test
    if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar Playwright." }
  } else {
    Write-Host "[OK] Playwright ja instalado."
  }

  Write-Host "[INFO] Conferindo Chromium..."
  npx playwright install chromium
  if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar/conferir Chromium." }

  $webProcess = Start-WebIfNeeded

  Write-Host ""
  Write-Host "[INFO] Iniciando walkthrough com barra 0 a 100..."
  Write-Host ""

  node .\scripts\support-guided-walkthrough.cjs
  $exit = $LASTEXITCODE

  if ($exit -ne 0) {
    throw "Walkthrough visual encontrou falhas. Veja apps\web\test-results\support-guided-walkthrough e apps\web\test-results\reports."
  }

  Write-Host ""
  Write-Host "[OK] Walkthrough visual concluido."
  Write-Host "[OK] Prints:"
  Write-Host "  $WebRoot\test-results\support-guided-walkthrough"
  Write-Host "[OK] Relatorios:"
  Write-Host "  $WebRoot\test-results\reports"
} catch {
  Write-Host ""
  Write-Host "[ERRO] Walkthrough visual falhou."
  Write-Host "Veja prints e relatorios em:"
  Write-Host "  $WebRoot\test-results"
  throw
} finally {
  if ($webProcess -and !$webProcess.HasExited) {
    Write-Host "[INFO] Encerrando servidor WEB iniciado por este runner..."
    try { $webProcess.Kill() } catch {}
  }

  Stop-Transcript | Out-Null
  Write-Host "[INFO] Transcript salvo em:"
  Write-Host "       $TranscriptPath"
}
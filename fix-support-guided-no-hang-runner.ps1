$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$ConfigPath = Join-Path $WebRoot "playwright.support-guided.config.ts"
$RunnerPath = Join-Path $ProjectRoot "run-support-guided-visual-tests.ps1"
$QuickRunnerPath = Join-Path $ProjectRoot "run-support-guided-visual-tests-quick.ps1"

function Write-Utf8NoBom {
  param(
    [string] $Path,
    [string] $LiteralPath,
    [AllowEmptyString()][string] $Content
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    $Path = $LiteralPath
  }

  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Caminho nao informado para Write-Utf8NoBom."
  }

  $Dir = [System.IO.Path]::GetDirectoryName($Path)
  if (![string]::IsNullOrWhiteSpace($Dir) -and ![System.IO.Directory]::Exists($Dir)) {
    [System.IO.Directory]::CreateDirectory($Dir) | Out-Null
  }

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Backup-File {
  param([Parameter(Mandatory = $true)][string] $Path)

  if (Test-Path -LiteralPath $Path) {
    $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $BackupPath = "$Path.bak-support-guided-no-hang-$Stamp"
    Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
    Write-Host "[OK] Backup criado: $BackupPath"
  }
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Corrigindo teste guiado para nao travar em Executando teste visual guiado"

Backup-File $ConfigPath
Backup-File $RunnerPath

$ConfigContent = @'
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/support-guided" }],
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  use: {
    baseURL: "http://localhost:3000",
    headless: false,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 12_000,
    navigationTimeout: 25_000,
    trace: "on",
    screenshot: "on",
    video: "retain-on-failure",
    launchOptions: {
      slowMo: 250,
    },
  }
});
'@

$RunnerContent = @'
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$ReportDir = Join-Path $WebRoot "test-results\reports"
$OutDir = Join-Path $WebRoot "test-results\support-guided"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $ReportDir "support-guided-visual-report-$Stamp.txt"
$OutputPath = Join-Path $ReportDir "support-guided-playwright-output-$Stamp.txt"

New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

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
  $logPath = Join-Path $ReportDir "support-guided-webserver-$Stamp.txt"

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

function Run-PlaywrightWithTimeout {
  param(
    [string] $Arguments,
    [int] $TimeoutSeconds
  )

  $playwrightCmd = Join-Path $WebRoot "node_modules\.bin\playwright.cmd"
  if (!(Test-Path -LiteralPath $playwrightCmd)) {
    $playwrightCmd = "npx"
    $Arguments = "playwright $Arguments"
  }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $playwrightCmd
  $psi.Arguments = $Arguments
  $psi.WorkingDirectory = $WebRoot
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $false

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi

  [void] $process.Start()

  $stdout = New-Object System.Text.StringBuilder
  $stderr = New-Object System.Text.StringBuilder

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastFlush = Get-Date

  while (-not $process.HasExited) {
    if ((Get-Date) -gt $deadline) {
      try { $process.Kill() } catch {}
      Add-Content -Path $OutputPath -Value "[ERRO] Timeout geral de $TimeoutSeconds segundos. Processo encerrado."
      throw "O Playwright travou por mais de $TimeoutSeconds segundos. Processo encerrado. Saida: $OutputPath"
    }

    $outChunk = $process.StandardOutput.ReadToEnd()
    if (![string]::IsNullOrEmpty($outChunk)) {
      [void] $stdout.Append($outChunk)
      Write-Host $outChunk -NoNewline
      Add-Content -Path $OutputPath -Value $outChunk
    }

    $errChunk = $process.StandardError.ReadToEnd()
    if (![string]::IsNullOrEmpty($errChunk)) {
      [void] $stderr.Append($errChunk)
      Write-Host $errChunk -NoNewline
      Add-Content -Path $OutputPath -Value $errChunk
    }

    if (((Get-Date) - $lastFlush).TotalSeconds -ge 10) {
      Write-Host "[INFO] Teste ainda rodando... se travar, o runner encerra sozinho."
      $lastFlush = Get-Date
    }

    Start-Sleep -Milliseconds 500
  }

  $outRest = $process.StandardOutput.ReadToEnd()
  if (![string]::IsNullOrEmpty($outRest)) {
    Write-Host $outRest -NoNewline
    Add-Content -Path $OutputPath -Value $outRest
  }

  $errRest = $process.StandardError.ReadToEnd()
  if (![string]::IsNullOrEmpty($errRest)) {
    Write-Host $errRest -NoNewline
    Add-Content -Path $OutputPath -Value $errRest
  }

  return $process.ExitCode
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Runner guiado V2 sem travamento"
Write-Host "[INFO] Relatorio completo: $ReportPath"
Write-Host "[INFO] Saida Playwright: $OutputPath"

Start-Transcript -Path $ReportPath -Force | Out-Null

$webProcess = $null

try {
  Set-Location $WebRoot

  if (!(Test-Path -LiteralPath ".\node_modules\@playwright\test")) {
    Write-Host "[INFO] Instalando @playwright/test..."
    npm install -D @playwright/test
    if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar @playwright/test." }
  } else {
    Write-Host "[OK] @playwright/test ja instalado."
  }

  Write-Host "[INFO] Conferindo Chromium do Playwright..."
  npx playwright install chromium
  if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar/conferir Chromium." }

  $webProcess = Start-WebIfNeeded

  Write-Host "[INFO] Listando testes encontrados..."
  $listCode = Run-PlaywrightWithTimeout `
    -Arguments "test tests/support-all-roles-guided.visual.spec.ts --config=playwright.support-guided.config.ts --project=chromium --list" `
    -TimeoutSeconds 60

  if ($listCode -ne 0) {
    throw "Nao consegui listar os testes. Saida: $OutputPath"
  }

  Write-Host ""
  Write-Host "[INFO] Executando teste visual guiado..."
  Write-Host "[INFO] Se alguma etapa travar, sera encerrada automaticamente em 300 segundos."

  $runCode = Run-PlaywrightWithTimeout `
    -Arguments "test tests/support-all-roles-guided.visual.spec.ts --config=playwright.support-guided.config.ts --project=chromium --workers=1 --global-timeout=280000 --timeout=45000 --reporter=list" `
    -TimeoutSeconds 300

  if ($runCode -ne 0) {
    throw "Teste visual guiado falhou. Saida completa: $OutputPath"
  }

  Write-Host ""
  Write-Host "[OK] Teste visual guiado finalizado."
  Write-Host "[OK] Prints salvos em: apps\web\test-results\support-guided"
  Write-Host "[OK] Relatorio HTML:"
  Write-Host "cd `"$WebRoot`""
  Write-Host "npx playwright show-report playwright-report/support-guided"
} catch {
  Write-Host ""
  Write-Host "[ERRO] Teste visual guiado falhou ou travou."
  Write-Host "Saida completa:"
  Write-Host "  $OutputPath"
  Write-Host "Prints, traces e videos:"
  Write-Host "  $WebRoot\test-results"
  Write-Host "Relatorio HTML:"
  Write-Host "  cd `"$WebRoot`""
  Write-Host "  npx playwright show-report playwright-report/support-guided"
  throw
} finally {
  if ($webProcess -and !$webProcess.HasExited) {
    Write-Host "[INFO] Encerrando servidor WEB iniciado por este runner..."
    try { $webProcess.Kill() } catch {}
  }

  Stop-Transcript | Out-Null
  Write-Host "[INFO] Relatorio completo salvo em:"
  Write-Host "       $ReportPath"
}
'@

$QuickRunnerContent = @'
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"

Set-Location $WebRoot

Write-Host "[INFO] Rodando somente a listagem dos testes, sem abrir navegador..."
npx playwright test tests/support-all-roles-guided.visual.spec.ts --config=playwright.support-guided.config.ts --project=chromium --list
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao listar testes."
}
'@

Write-Utf8NoBom -Path $ConfigPath -Content $ConfigContent
Write-Host "[OK] Config guiado atualizado sem webServer interno."

Write-Utf8NoBom -Path $RunnerPath -Content $RunnerContent
Write-Host "[OK] Runner guiado V2 sem travamento criado."

Write-Utf8NoBom -Path $QuickRunnerPath -Content $QuickRunnerContent
Write-Host "[OK] Runner rapido de listagem criado."

Write-Host ""
Write-Host "[OK] Runner corrigido."
Write-Host ""
Write-Host "Primeiro teste rapido:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-support-guided-visual-tests-quick.ps1"
Write-Host ""
Write-Host "Depois rode o visual completo:"
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-support-guided-visual-tests.ps1"

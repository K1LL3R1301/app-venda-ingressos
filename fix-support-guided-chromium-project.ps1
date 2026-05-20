$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$ConfigPath = Join-Path $WebRoot "playwright.support-guided.config.ts"
$RunnerPath = Join-Path $ProjectRoot "run-support-guided-visual-tests.ps1"
$DebugRunnerPath = Join-Path $ProjectRoot "run-support-guided-visual-tests-debug.ps1"

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
    $BackupPath = "$Path.bak-fix-support-guided-chromium-$Stamp"
    Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
    Write-Host "[OK] Backup criado: $BackupPath"
  } else {
    Write-Host "[AVISO] Arquivo nao encontrado para backup: $Path" -ForegroundColor Yellow
  }
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Corrigindo projeto chromium do Playwright guiado"

Backup-File $ConfigPath
Backup-File $RunnerPath
Backup-File $DebugRunnerPath

$ConfigContent = @'
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: {
    timeout: 12_000,
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
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: "on",
    screenshot: "on",
    video: "retain-on-failure",
    launchOptions: {
      slowMo: 450,
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
'@

$RunnerContent = @'
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$ReportDir = Join-Path $WebRoot "test-results\reports"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $ReportDir "support-guided-visual-report-$Stamp.txt"

New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Rodando teste visual guiado do suporte"
Write-Host "[INFO] O navegador vai abrir em modo headed com movimentos lentos."
Write-Host "[INFO] Relatorio completo: $ReportPath"

Start-Transcript -Path $ReportPath -Force | Out-Null

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
  if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar/conferir Chromium do Playwright." }

  Write-Host "[INFO] Executando teste visual guiado..."
  npx playwright test tests/support-all-roles-guided.visual.spec.ts --config=playwright.support-guided.config.ts --project=chromium
  if ($LASTEXITCODE -ne 0) { throw "Teste visual guiado falhou. Abra o relatorio e os prints para ver o ponto exato." }

  Write-Host ""
  Write-Host "[OK] Teste visual guiado finalizado."
  Write-Host "[OK] Prints salvos em: apps\web\test-results\support-guided"
  Write-Host "[OK] Relatorio HTML:"
  Write-Host "cd `"$WebRoot`""
  Write-Host "npx playwright show-report playwright-report/support-guided"
} catch {
  Write-Host ""
  Write-Host "[ERRO] Teste visual guiado falhou."
  Write-Host "Veja prints, traces e videos em:"
  Write-Host "  $WebRoot\test-results"
  Write-Host "Relatorio HTML:"
  Write-Host "  cd `"$WebRoot`""
  Write-Host "  npx playwright show-report playwright-report/support-guided"
  throw
} finally {
  Stop-Transcript | Out-Null
  Write-Host "[INFO] Relatorio completo salvo em:"
  Write-Host "       $ReportPath"
}
'@

$DebugRunnerContent = @'
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"

Write-Host "[INFO] Modo debug: o Playwright Inspector vai abrir."
Write-Host "[INFO] Use Resume/Step Over para acompanhar acao por acao."

Set-Location $WebRoot

if (!(Test-Path -LiteralPath ".\node_modules\@playwright\test")) {
  npm install -D @playwright/test
  if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar @playwright/test." }
}

npx playwright install chromium
if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar/conferir Chromium do Playwright." }

npx playwright test tests/support-all-roles-guided.visual.spec.ts --config=playwright.support-guided.config.ts --debug --project=chromium
if ($LASTEXITCODE -ne 0) { throw "Teste debug falhou ou foi interrompido." }
'@

Write-Utf8NoBom -Path $ConfigPath -Content $ConfigContent
Write-Host "[OK] playwright.support-guided.config.ts agora tem project chromium."

Write-Utf8NoBom -Path $RunnerPath -Content $RunnerContent
Write-Host "[OK] Runner guiado agora detecta erro corretamente."

Write-Utf8NoBom -Path $DebugRunnerPath -Content $DebugRunnerContent
Write-Host "[OK] Runner debug corrigido."

Write-Host ""
Write-Host "[OK] Playwright guiado corrigido."
Write-Host ""
Write-Host "Rode novamente:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-support-guided-visual-tests.ps1"
Write-Host ""
Write-Host "Ou passo a passo:"
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-support-guided-visual-tests-debug.ps1"

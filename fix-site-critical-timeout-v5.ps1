$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$CriticalSpecPath = Join-Path $WebRoot "tests\site-critical-flows.visual.spec.ts"
$LocalConfigPath = Join-Path $WebRoot "playwright.local.config.ts"
$CorePath = Join-Path $ProjectRoot "run-site-visual-tests-core.ps1"
$RunnerPath = Join-Path $ProjectRoot "run-site-visual-tests.ps1"
$HeadedRunnerPath = Join-Path $ProjectRoot "run-site-visual-tests-headed.ps1"
$AuditRunnerPath = Join-Path $ProjectRoot "run-site-visual-audit.ps1"

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
    $BackupPath = "$Path.bak-site-visual-v5-$Stamp"
    Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
    Write-Host "[OK] Backup criado: $BackupPath"
  }
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Corrigindo timeout do spec site-critical-flows e runner V5"

Backup-File $CriticalSpecPath
Backup-File $LocalConfigPath
Backup-File $CorePath
Backup-File $RunnerPath
Backup-File $HeadedRunnerPath
Backup-File $AuditRunnerPath

$LocalConfig = @'
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 25_000,
  globalTimeout: 180_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 12_000,
    actionTimeout: 5_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
      },
    },
  ],
});
'@

$CriticalSpec = @'
import { expect, test } from "@playwright/test";
import {
  collectPageProblems,
  saveVisualScreenshot,
  seedSession,
  seedSupportTicket,
} from "./_helpers/visual-auth";

async function openFast(page: import("@playwright/test").Page, path: string) {
  page.setDefaultTimeout(5_000);
  page.setDefaultNavigationTimeout(12_000);

  await page.goto(path, {
    waitUntil: "domcontentloaded",
    timeout: 12_000,
  });

  await page.waitForTimeout(700);
}

test.describe("visual: fluxos criticos fora do suporte", () => {
  test.setTimeout(25_000);

  test("admin wallet abre e mostra resumo financeiro sem crash", async ({ page }) => {
    const problems = await collectPageProblems(page);

    await seedSession(page, "ADMIN");
    await seedSupportTicket(page);

    await openFast(page, "/admin/wallet");

    const bodyText = await page.locator("body").innerText({ timeout: 5_000 });

    await saveVisualScreenshot(page, "flow-admin-wallet-resumo");

    expect.soft(bodyText).not.toMatch(
      /This page couldn't load|Application error|Unhandled Runtime Error|Objects are not valid as a React child|Hydration failed/i,
    );

    expect.soft(bodyText).toMatch(/Wallet|Receitas dos eventos|Valor real produtor|Vendas pagas/i);
    expect.soft(problems, "admin-wallet console/page errors").toEqual([]);
  });

  test("login aparece limpo sem sessão", async ({ page }) => {
    const problems = await collectPageProblems(page);

    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.removeItem("astro_session_token");
      localStorage.removeItem("astro_session_user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    });

    await openFast(page, "/login");

    const body = await page.locator("body").innerText({ timeout: 5_000 });

    await saveVisualScreenshot(page, "flow-login-limpo");

    expect.soft(body).toMatch(/login|entrar|cpf|senha|astro/i);
    expect.soft(body).not.toMatch(/Application error|Unhandled Runtime Error|Hydration failed/i);
    expect.soft(problems, "login console/page errors").toEqual([]);
  });

  test("menu principal do admin nao quebra", async ({ page }) => {
    const problems = await collectPageProblems(page);

    await seedSession(page, "ADMIN");
    await openFast(page, "/admin/wallet");

    const bodyBefore = await page.locator("body").innerText({ timeout: 5_000 });

    const possibleMenuButtons = page
      .locator("button")
      .filter({ hasText: /menu|☰|A|abrir/i });

    const count = await possibleMenuButtons.count().catch(() => 0);

    if (count > 0) {
      await possibleMenuButtons.first().click({ timeout: 3_000 }).catch(() => undefined);
      await page.waitForTimeout(300);
    }

    const bodyAfter = await page.locator("body").innerText({ timeout: 5_000 });

    await saveVisualScreenshot(page, "flow-menu-principal-admin");

    expect.soft(bodyBefore + "\n" + bodyAfter).toMatch(/Wallet|Admin|Painel|Eventos|Operadores|Suporte|Astro/i);
    expect.soft(bodyAfter).not.toMatch(/Application error|Unhandled Runtime Error|Hydration failed/i);
    expect.soft(problems, "menu console/page errors").toEqual([]);
  });
});
'@

$CoreRunner = @'
param(
  [switch] $Headed,
  [switch] $Audit
)

$ErrorActionPreference = if ($Audit) { "Continue" } else { "Stop" }

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$TestsDir = Join-Path $WebRoot "tests"
$ReportDir = Join-Path $WebRoot "test-results\reports"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ModeName = if ($Headed) { "headed" } else { "headless" }
$ReportPath = Join-Path $ReportDir "site-visual-report-v5-$ModeName-$Stamp.txt"
$SummaryPath = Join-Path $ReportDir "site-visual-summary-v5-$ModeName-$Stamp.txt"
$ServerLogPath = Join-Path $ReportDir "web-server-v5-$Stamp.log"
$SpecTimeoutSeconds = if ($Headed) { 180 } else { 120 }

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

function Test-WebReady {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Wait-WebReady {
  param([int] $TimeoutSeconds = 120)

  $startedAt = Get-Date

  while (((Get-Date) - $startedAt).TotalSeconds -lt $TimeoutSeconds) {
    if (Test-WebReady) {
      return $true
    }

    Start-Sleep -Seconds 2
  }

  return $false
}

function Stop-ProcessTree {
  param([int] $PidToStop)

  try {
    taskkill.exe /PID $PidToStop /T /F | Out-Null
  } catch {
    try {
      Stop-Process -Id $PidToStop -Force -ErrorAction SilentlyContinue
    } catch {}
  }
}

if (!(Test-Path -LiteralPath $ReportDir)) {
  New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
}

$TranscriptStarted = $false
$OverallExitCode = 0
$VisualSpecs = @()
$StartedServer = $null
$SpecResults = New-Object System.Collections.Generic.List[string]

try {
  Start-Transcript -Path $ReportPath -Force | Out-Null
  $TranscriptStarted = $true

  Write-Host "[INFO] Projeto: $ProjectRoot"
  Write-Host "[INFO] Runner visual V5"
  Write-Host "[INFO] Modo: $ModeName"
  Write-Host "[INFO] Timeout por arquivo spec: $SpecTimeoutSeconds segundos"
  Write-Host "[INFO] Relatorio completo:"
  Write-Host "       $ReportPath"
  Write-Host ""

  if (!(Test-Path -LiteralPath $WebRoot)) {
    Write-Host "[ERRO] Pasta web nao encontrada: $WebRoot"
    $OverallExitCode = 1
    return
  }

  Set-Location $WebRoot

  $VisualSpecs = Get-ChildItem -Path $TestsDir -Filter "*.visual.spec.ts" -File -ErrorAction SilentlyContinue |
    Sort-Object FullName |
    ForEach-Object {
      $relative = $_.FullName.Substring($WebRoot.Length + 1)
      $relative.Replace("\", "/")
    }

  if (!$VisualSpecs -or $VisualSpecs.Count -eq 0) {
    Write-Host "[ERRO] Nenhum arquivo *.visual.spec.ts encontrado em:" -ForegroundColor Red
    Write-Host "       $TestsDir" -ForegroundColor Red
    $OverallExitCode = 1
    return
  }

  Write-Host "[INFO] Arquivos de teste visual encontrados:"
  foreach ($Spec in $VisualSpecs) {
    Write-Host " - $Spec"
  }

  if (!(Test-Path -LiteralPath (Join-Path $WebRoot "node_modules\@playwright\test"))) {
    Write-Host "[INFO] Instalando @playwright/test..."
    npm install -D @playwright/test
    if ($LASTEXITCODE -ne 0) {
      $OverallExitCode = $LASTEXITCODE
      Write-Host "[ERRO] Falha ao instalar @playwright/test."
      return
    }
  } else {
    Write-Host "[OK] @playwright/test ja instalado."
  }

  $PlaywrightCmd = Join-Path $WebRoot "node_modules\.bin\playwright.cmd"

  if (!(Test-Path -LiteralPath $PlaywrightCmd)) {
    Write-Host "[ERRO] Playwright local nao encontrado em: $PlaywrightCmd"
    Write-Host "[INFO] Tentando npm install -D @playwright/test..."
    npm install -D @playwright/test

    if (!(Test-Path -LiteralPath $PlaywrightCmd)) {
      $OverallExitCode = 1
      return
    }
  }

  Write-Host "[INFO] Conferindo navegador Chromium do Playwright..."
  & $PlaywrightCmd install chromium
  if ($LASTEXITCODE -ne 0) {
    $OverallExitCode = $LASTEXITCODE
    Write-Host "[ERRO] Falha ao instalar/conferir navegador Chromium."
    return
  }

  if (Test-WebReady) {
    Write-Host "[OK] Site ja esta respondendo em http://localhost:3000"
  } else {
    Write-Host "[INFO] Site nao respondeu em localhost:3000. Vou subir npm run dev para o teste."
    Write-Host "[INFO] Log do servidor:"
    Write-Host "       $ServerLogPath"

    $StartedServer = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory $WebRoot -RedirectStandardOutput $ServerLogPath -RedirectStandardError $ServerLogPath -PassThru -WindowStyle Hidden

    if (!(Wait-WebReady -TimeoutSeconds 140)) {
      Write-Host "[ERRO] Site nao ficou pronto em localhost:3000 dentro do limite."
      if (Test-Path -LiteralPath $ServerLogPath) {
        Write-Host "[INFO] Ultimas linhas do servidor:"
        Get-Content -LiteralPath $ServerLogPath -Tail 80
      }
      $OverallExitCode = 1
      return
    }

    Write-Host "[OK] Site ficou pronto."
  }

  foreach ($Spec in $VisualSpecs) {
    $SafeSpec = $Spec.Replace("/", "_").Replace("\", "_").Replace(":", "")
    $SpecOut = Join-Path $ReportDir "spec-v5-$SafeSpec-$Stamp.out.txt"
    $SpecErr = Join-Path $ReportDir "spec-v5-$SafeSpec-$Stamp.err.txt"

    $Args = @("test", $Spec, "--config=playwright.local.config.ts", "--project=chromium", "--timeout=25000", "--global-timeout=110000", "--workers=1", "--reporter=list", "--max-failures=1")

    if ($Headed) {
      $Args += "--headed"
    }

    Write-Host ""
    Write-Host "============================================================"
    Write-Host "[INFO] Rodando spec: $Spec"
    Write-Host "[INFO] Comando: $PlaywrightCmd $($Args -join ' ')"
    Write-Host "============================================================"

    $Process = Start-Process -FilePath $PlaywrightCmd -ArgumentList $Args -WorkingDirectory $WebRoot -RedirectStandardOutput $SpecOut -RedirectStandardError $SpecErr -PassThru -WindowStyle Hidden

    $Completed = $Process.WaitForExit($SpecTimeoutSeconds * 1000)

    if (!$Completed) {
      Write-Host "[ERRO] TIMEOUT no spec $Spec. Encerrando processo."
      Stop-ProcessTree -PidToStop $Process.Id
      $OverallExitCode = 124
      $SpecResults.Add("TIMEOUT - $Spec")
    } else {
      if ($Process.ExitCode -eq 0) {
        Write-Host "[OK] Spec passou: $Spec"
        $SpecResults.Add("PASSOU - $Spec")
      } else {
        Write-Host "[ERRO] Spec falhou: $Spec - exit code $($Process.ExitCode)"
        $SpecResults.Add("FALHOU - $Spec - exit code $($Process.ExitCode)")
        if ($OverallExitCode -eq 0) {
          $OverallExitCode = $Process.ExitCode
        }
      }
    }

    if (Test-Path -LiteralPath $SpecOut) {
      Write-Host ""
      Write-Host "[SAIDA DO SPEC]"
      Get-Content -LiteralPath $SpecOut
    }

    if (Test-Path -LiteralPath $SpecErr) {
      $errText = Get-Content -LiteralPath $SpecErr -Raw
      if (![string]::IsNullOrWhiteSpace($errText)) {
        Write-Host ""
        Write-Host "[ERROS DO SPEC]"
        Write-Host $errText
      }
    }

    if (!$Audit -and $OverallExitCode -ne 0) {
      Write-Host "[INFO] Parando no primeiro erro porque nao esta em modo auditoria."
      break
    }
  }

  Write-Host ""
  Write-Host "============================================================"
  Write-Host "[RESUMO DOS SPECS]"
  foreach ($Result in $SpecResults) {
    Write-Host " - $Result"
  }
  Write-Host "============================================================"

  if ($OverallExitCode -eq 0) {
    Write-Host "[OK] Todos os testes visuais passaram."
  } elseif ($OverallExitCode -eq 124) {
    Write-Host "[ERRO] Pelo menos um spec travou e foi encerrado por timeout."
  } else {
    Write-Host "[ERRO] Pelo menos um spec falhou."
  }

  Write-Host ""
  Write-Host "Prints, videos, traces e relatorios:"
  Write-Host "  $WebRoot\test-results"
  Write-Host ""
  Write-Host "Relatorio HTML:"
  Write-Host "  cd `"$WebRoot`""
  Write-Host "  npx playwright show-report"
} finally {
  if ($StartedServer -and !$StartedServer.HasExited) {
    Write-Host "[INFO] Encerrando servidor web iniciado pelo runner..."
    Stop-ProcessTree -PidToStop $StartedServer.Id
  }

  if ($TranscriptStarted) {
    try {
      Stop-Transcript | Out-Null
    } catch {}
  }

  $Status = if ($OverallExitCode -eq 0) {
    "PASSOU"
  } elseif ($OverallExitCode -eq 124) {
    "TIMEOUT"
  } else {
    "FALHOU"
  }

  $SpecsText = if ($SpecResults.Count -gt 0) {
    ($SpecResults -join "`r`n - ")
  } else {
    "Nenhum spec executado"
  }

  $Summary = @"
RELATORIO RESUMIDO - TESTES VISUAIS DO SITE
===========================================

Status final: $Status
Exit code: $OverallExitCode
Modo: $ModeName
Timeout por spec: $SpecTimeoutSeconds segundos
Data/hora: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")

Projeto:
$ProjectRoot

Web:
$WebRoot

Resultado por spec:
 - $SpecsText

Relatorio completo do terminal:
$ReportPath

Prints, videos e traces:
$WebRoot\test-results

Relatorio HTML do Playwright:
cd "$WebRoot"
npx playwright show-report
"@

  Write-Utf8NoBom -Path $SummaryPath -Content $Summary

  Write-Host ""
  Write-Host "[INFO] Relatorio completo salvo em:"
  Write-Host "       $ReportPath"
  Write-Host "[INFO] Resumo salvo em:"
  Write-Host "       $SummaryPath"

  try {
    Start-Process notepad.exe $ReportPath
  } catch {
    Write-Host "[AVISO] Nao consegui abrir o Bloco de Notas automaticamente."
  }
}

if (!$Audit -and $OverallExitCode -ne 0) {
  throw "Testes visuais do site nao passaram. Relatorio completo: $ReportPath"
}
'@

$MainRunner = @'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Core = Join-Path $ScriptDir "run-site-visual-tests-core.ps1"

if (!(Test-Path -LiteralPath $Core)) {
  throw "Runner core nao encontrado: $Core"
}

& $Core
'@

$HeadedRunner = @'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Core = Join-Path $ScriptDir "run-site-visual-tests-core.ps1"

if (!(Test-Path -LiteralPath $Core)) {
  throw "Runner core nao encontrado: $Core"
}

& $Core -Headed
'@

$AuditRunner = @'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Core = Join-Path $ScriptDir "run-site-visual-tests-core.ps1"

if (!(Test-Path -LiteralPath $Core)) {
  throw "Runner core nao encontrado: $Core"
}

& $Core -Audit
'@

Write-Utf8NoBom -Path $LocalConfigPath -Content $LocalConfig
Write-Host "[OK] Config local atualizada."

Write-Utf8NoBom -Path $CriticalSpecPath -Content $CriticalSpec
Write-Host "[OK] site-critical-flows reescrito para nao travar."

Write-Utf8NoBom -Path $CorePath -Content $CoreRunner
Write-Host "[OK] Core runner V5 criado."

Write-Utf8NoBom -Path $RunnerPath -Content $MainRunner
Write-Host "[OK] Runner principal atualizado."

Write-Utf8NoBom -Path $HeadedRunnerPath -Content $HeadedRunner
Write-Host "[OK] Runner headed atualizado."

Write-Utf8NoBom -Path $AuditRunnerPath -Content $AuditRunner
Write-Host "[OK] Runner de auditoria atualizado."

Write-Host ""
Write-Host "[OK] Correção V5 aplicada."
Write-Host ""
Write-Host "Agora rode:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-site-visual-tests.ps1"

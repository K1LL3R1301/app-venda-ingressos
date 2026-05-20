$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Core = Join-Path $ScriptDir "run-site-visual-tests-core.ps1"

if (!(Test-Path -LiteralPath $Core)) {
  throw "Runner core nao encontrado: $Core"
}

& $Core -Audit
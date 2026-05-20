$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"

$Files = @(
  (Join-Path $WebRoot "src\app\admin\support\page.tsx"),
  (Join-Path $WebRoot "src\app\operator\support\page.tsx"),
  (Join-Path $WebRoot "src\app\admin\super\support\page.tsx")
)

function Write-Utf8NoBom {
  param(
    [string] $Path,
    [AllowEmptyString()][string] $Content
  )

  $Dir = [System.IO.Path]::GetDirectoryName($Path)
  if (![string]::IsNullOrWhiteSpace($Dir) -and ![System.IO.Directory]::Exists($Dir)) {
    [System.IO.Directory]::CreateDirectory($Dir) | Out-Null
  }

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Backup-File {
  param([Parameter(Mandatory = $true)][string] $Path)

  if (!(Test-Path -LiteralPath $Path)) {
    Write-Host "[AVISO] Arquivo nao encontrado: $Path" -ForegroundColor Yellow
    return
  }

  $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $BackupPath = "$Path.bak-fix-support-label-null-$Stamp"
  Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
  Write-Host "[OK] Backup criado: $BackupPath"
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Corrigindo tipo label(value) para aceitar null nas telas de suporte"

foreach ($File in $Files) {
  if (!(Test-Path -LiteralPath $File)) {
    Write-Host "[AVISO] Pulando arquivo inexistente: $File" -ForegroundColor Yellow
    continue
  }

  Backup-File $File

  $Text = [System.IO.File]::ReadAllText($File)
  $Original = $Text

  $Text = $Text.Replace("function label(value?: string) {", "function label(value?: string | null) {")
  $Text = $Text.Replace("function supportTargetLabel(value?: string) {", "function supportTargetLabel(value?: string | null) {")
  $Text = $Text.Replace("function supportStatusLabel(value?: string) {", "function supportStatusLabel(value?: string | null) {")
  $Text = $Text.Replace("function statusLabel(value?: string) {", "function statusLabel(value?: string | null) {")
  $Text = $Text.Replace("function priorityLabel(value?: string) {", "function priorityLabel(value?: string | null) {")

  if ($Text -ne $Original) {
    Write-Utf8NoBom -Path $File -Content $Text
    Write-Host "[OK] Corrigido: $File"
  } else {
    Write-Host "[OK] Nenhuma troca necessaria: $File"
  }
}

$NextDir = Join-Path $WebRoot ".next"
if (Test-Path -LiteralPath $NextDir) {
  try {
    Remove-Item -LiteralPath $NextDir -Recurse -Force -ErrorAction Stop
    Write-Host "[OK] Cache .next apagado."
  } catch {
    Write-Host "[AVISO] Nao consegui apagar .next. Pare a WEB com Ctrl+C antes de subir novamente." -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "[OK] Patch aplicado."
Write-Host ""
Write-Host "Agora rode:"
Write-Host "cd `"$WebRoot`""
Write-Host "npm run build *> log-web-fix-support-label-null-build.txt"
Write-Host "Select-String -Path .\log-web-fix-support-label-null-build.txt -Pattern `"error|Error:|Failed|Cannot find|Type error|Module not found|admin/support|operator/support|super/support|label`" -Context 2,3"
Write-Host ""
Write-Host "Se passar, commite:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "git add -A"
Write-Host "git commit -m `"Corrige tipo das labels do suporte`""
Write-Host "git push"

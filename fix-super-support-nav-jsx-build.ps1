$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$SupportPagePath = Join-Path $WebRoot "src\app\admin\super\support\page.tsx"

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

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Corrigindo JSX quebrado na tela /admin/super/support"

if (!(Test-Path -LiteralPath $SupportPagePath)) {
  throw "Nao encontrei: $SupportPagePath"
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupPath = "$SupportPagePath.bak-fix-super-support-nav-jsx-$Stamp"
Copy-Item -LiteralPath $SupportPagePath -Destination $BackupPath -Force
Write-Host "[OK] Backup criado: $BackupPath"

$Text = [System.IO.File]::ReadAllText($SupportPagePath)
$Original = $Text

# O script anterior inseriu <SuperAdminNav /> logo antes de um fechamento de return
# em uma tela que ja tinha um unico root JSX. Isso gera "Expression expected".
# Removemos essas insercoes soltas somente na pagina de suporte.
$Text = [System.Text.RegularExpressions.Regex]::Replace(
  $Text,
  '\r?\n\s*<SuperAdminNav\s*/>\s*(?=\r?\n\s*\);)',
  ''
)

# Se sobrou import do SuperAdminNav sem uso, remove para evitar lint/aviso.
if ($Text -notmatch '<SuperAdminNav\s*/>') {
  $Text = [System.Text.RegularExpressions.Regex]::Replace(
    $Text,
    '\r?\nimport SuperAdminNav from "\.\./_components/SuperAdminNav";\s*',
    "`r`n"
  )
}

if ($Text -eq $Original) {
  Write-Host "[AVISO] Nenhuma alteracao aplicada. Vou mostrar linhas com SuperAdminNav para revisao." -ForegroundColor Yellow
  Select-String -Path $SupportPagePath -Pattern "SuperAdminNav" -Context 3,3 | ForEach-Object { Write-Host $_ }
} else {
  Write-Utf8NoBom -Path $SupportPagePath -Content $Text
  Write-Host "[OK] Insercao solta do SuperAdminNav removida da tela de suporte."
}

Set-Location $WebRoot

Write-Host "[INFO] Rodando build da web..."
cmd /c "npm run build > log-web-fix-super-support-nav-jsx-build.txt 2>&1"

$BuildLogPath = Join-Path $WebRoot "log-web-fix-super-support-nav-jsx-build.txt"
$Errors = Select-String -Path $BuildLogPath -Pattern "error|Error:|Failed|Cannot find|Type error|Module not found|SuperAdminNav|Expected|Duplicate|support|finance|reports|organizers|events|orders|operators|fees" -Context 2,3

if ($Errors) {
  Write-Host "[AVISO] Build gerou linhas filtradas. Veja abaixo:" -ForegroundColor Yellow
  $Errors | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "[OK] Build sem erros filtrados."
}

Write-Host ""
Write-Host "[OK] Correcao aplicada."
Write-Host ""
Write-Host "Depois confira:"
Write-Host "http://localhost:3000/admin/super/finance"
Write-Host "http://localhost:3000/admin/super/reports"
Write-Host "http://localhost:3000/admin/super/support"

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiRoot = Join-Path $ProjectRoot "apps\api"
$QrServicePath = Join-Path $ApiRoot "src\tickets\tickets-qr.service.ts"

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
Write-Host "[INFO] Corrigindo permissao do QR apos transferencia"

if (!(Test-Path -LiteralPath $QrServicePath)) {
  throw "Arquivo nao encontrado: $QrServicePath"
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupPath = "$QrServicePath.bak-fix-qr-owner-transfer-$Stamp"
Copy-Item -LiteralPath $QrServicePath -Destination $BackupPath -Force
Write-Host "[OK] Backup criado: $BackupPath"

$Text = [System.IO.File]::ReadAllText($QrServicePath)
$Original = $Text

$OldBlock = @'
    const orderCustomerUserId = params.ticket.orderItem.order.customerUserId;
    const currentOwnerUserId = params.ticket.currentOwnerUserId;

    return (
      currentOwnerUserId === params.userId || orderCustomerUserId === params.userId
    );
'@

$NewBlock = @'
    const currentOwnerUserId = params.ticket.currentOwnerUserId;

    return currentOwnerUserId === params.userId;
'@

if ($Text.Contains($OldBlock)) {
  $Text = $Text.Replace($OldBlock, $NewBlock)
  Write-Host "[OK] Regra alterada: customer so gera QR se for dono atual do ticket."
} else {
  $Pattern = 'const\s+orderCustomerUserId\s*=\s*params\.ticket\.orderItem\.order\.customerUserId;\s*const\s+currentOwnerUserId\s*=\s*params\.ticket\.currentOwnerUserId;\s*return\s*\(\s*currentOwnerUserId\s*===\s*params\.userId\s*\|\|\s*orderCustomerUserId\s*===\s*params\.userId\s*\);'
  $Replacement = 'const currentOwnerUserId = params.ticket.currentOwnerUserId;' + "`r`n`r`n" + '    return currentOwnerUserId === params.userId;'
  $Text = [System.Text.RegularExpressions.Regex]::Replace($Text, $Pattern, $Replacement)

  if ($Text -eq $Original) {
    throw "Nao encontrei o bloco de permissao antiga no tickets-qr.service.ts."
  }

  Write-Host "[OK] Regra alterada por regex."
}

Write-Utf8NoBom -Path $QrServicePath -Content $Text

Set-Location $ApiRoot

Write-Host "[INFO] Rodando build da API..."
npm run build *> log-api-fix-qr-owner-transfer-build.txt

$BuildLogPath = Join-Path $ApiRoot "log-api-fix-qr-owner-transfer-build.txt"
$Errors = Select-String -Path $BuildLogPath -Pattern "error|Error:|Failed|Cannot find|Type error|Module not found|tickets-qr|Forbidden|Prisma" -Context 2,3

if ($Errors) {
  Write-Host "[AVISO] Build gerou linhas filtradas. Veja abaixo:" -ForegroundColor Yellow
  $Errors | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "[OK] Build sem erros filtrados."
}

Write-Host ""
Write-Host "[OK] Correcao aplicada."
Write-Host ""
Write-Host "Agora reinicie a API e rode novamente o teste de transferencia:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-ticket-transfer-real-api-tests.ps1"
Write-Host ""
Write-Host "Depois, se passar:"
Write-Host "git add -A"
Write-Host "git commit -m `"Corrige QR apos transferencia de ingresso`""
Write-Host "git push"

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiRoot = Join-Path $ProjectRoot "apps\api"
$OrdersServicePath = Join-Path $ApiRoot "src\orders\orders.service.ts"
$JsRunnerPath = Join-Path $ProjectRoot "run-cancellation-deep-real-api-tests.js"

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
  param([string] $Path, [string] $Tag)

  if (!(Test-Path -LiteralPath $Path)) {
    throw "Arquivo nao encontrado: $Path"
  }

  $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $BackupPath = "$Path.bak-$Tag-$Stamp"
  Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
  Write-Host "[OK] Backup criado: $BackupPath"
}

function Replace-MethodByName {
  param(
    [string] $Text,
    [string] $MethodName,
    [string] $NewMethod
  )

  $Match = [System.Text.RegularExpressions.Regex]::Match($Text, "private\s+$MethodName\s*\(")

  if (!$Match.Success) {
    throw "Nao encontrei o metodo private $MethodName(...)"
  }

  $Start = $Match.Index
  $OpenBrace = $Text.IndexOf("{", $Match.Index)

  if ($OpenBrace -lt 0) {
    throw "Nao encontrei chave de abertura do metodo $MethodName."
  }

  $Depth = 0
  $End = -1

  for ($i = $OpenBrace; $i -lt $Text.Length; $i++) {
    $ch = $Text[$i]

    if ($ch -eq "{") {
      $Depth++
    } elseif ($ch -eq "}") {
      $Depth--

      if ($Depth -eq 0) {
        $End = $i + 1
        break
      }
    }
  }

  if ($End -lt 0) {
    throw "Nao encontrei fim do metodo $MethodName."
  }

  return $Text.Substring(0, $Start) + $NewMethod + $Text.Substring($End)
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Corrigindo REFUND_60 no backend e email curto no runner Node"

# 1) Backend: getCancellationConfig precisa reconhecer REFUND_60, 60%, sem wallet.
Backup-File -Path $OrdersServicePath -Tag "fix-refund60-config"

$ServiceText = [System.IO.File]::ReadAllText($OrdersServicePath)

$NewGetCancellationConfig = @'
  private getCancellationConfig(mode?: string) {
    const normalizedMode = String(mode || 'WALLET_80').toUpperCase();

    if (normalizedMode === 'REFUND_60') {
      return {
        mode: 'REFUND_60',
        percent: new Prisma.Decimal(0.6),
        cancellationStatus: 'REFUND_REQUESTED',
        createWalletCredit: false,
      };
    }

    return {
      mode: 'WALLET_80',
      percent: new Prisma.Decimal(0.8),
      cancellationStatus: 'WALLET_CREDITED',
      createWalletCredit: true,
    };
  }

'@

$ServiceText = Replace-MethodByName -Text $ServiceText -MethodName "getCancellationConfig" -NewMethod $NewGetCancellationConfig

# Ajusta descricao da wallet para ficar clara e nao chamar tudo de estorno.
$ServiceText = $ServiceText.Replace(
  "description: `Credito de 80% por estorno do QR ${ticket.id}`,",
  "description: `Credito de 80% na wallet pelo cancelamento do QR ${ticket.id}`,"
)

Write-Utf8NoBom -Path $OrdersServicePath -Content $ServiceText
Write-Host "[OK] getCancellationConfig atualizado: WALLET_80 e REFUND_60."

# 2) Runner Node: email curto para evitar limite de local-part do IsEmail.
if (Test-Path -LiteralPath $JsRunnerPath) {
  Backup-File -Path $JsRunnerPath -Tag "fix-short-emails"

  $Js = [System.IO.File]::ReadAllText($JsRunnerPath)

  if ($Js -notmatch "safeKind") {
    $Old = @'
  const random = Math.floor(100000000 + Math.random() * 899999999);
  const cpf = `94${random}`;
  const email = `cancel-deep-node-${kind}-${stamp}-${random}@astroingressos.local`;
  const password = "Teste1234!";
  const name = `Cliente Cancel Deep Node ${kind} ${random}`;
'@

    $New = @'
  const random = Math.floor(100000000 + Math.random() * 899999999);
  const safeKind = String(kind || "user").replace(/[^a-z0-9]/gi, "").slice(0, 12) || "user";
  const safeStamp = String(stamp || "").replace(/[^0-9]/g, "").slice(0, 14);
  const cpf = `94${random}`;
  const email = `cd-${safeKind}-${safeStamp}-${random}@astroingressos.com.br`;
  const password = "Teste1234!";
  const name = `Cliente Cancel Deep Node ${kind} ${random}`;
'@

    if ($Js.Contains($Old)) {
      $Js = $Js.Replace($Old, $New)
      Write-Host "[OK] Email curto aplicado no runner Node."
    } else {
      $Pattern = '  const random = Math\.floor\(100000000 \+ Math\.random\(\) \* 899999999\);\s*  const cpf = `94\$\{random\}`;\s*  const email = `cancel-deep-node-\$\{kind\}-\$\{stamp\}-\$\{random\}@astroingressos\.local`;\s*  const password = "Teste1234!";\s*  const name = `Cliente Cancel Deep Node \$\{kind\} \$\{random\}`;'
      $Replacement = @'
  const random = Math.floor(100000000 + Math.random() * 899999999);
  const safeKind = String(kind || "user").replace(/[^a-z0-9]/gi, "").slice(0, 12) || "user";
  const safeStamp = String(stamp || "").replace(/[^0-9]/g, "").slice(0, 14);
  const cpf = `94${random}`;
  const email = `cd-${safeKind}-${safeStamp}-${random}@astroingressos.com.br`;
  const password = "Teste1234!";
  const name = `Cliente Cancel Deep Node ${kind} ${random}`;
'@
      $Next = [System.Text.RegularExpressions.Regex]::Replace($Js, $Pattern, $Replacement)

      if ($Next -eq $Js) {
        Write-Host "[AVISO] Nao encontrei o bloco antigo do email. Vou continuar sem alterar runner." -ForegroundColor Yellow
      } else {
        $Js = $Next
        Write-Host "[OK] Email curto aplicado no runner Node por regex."
      }
    }

    Write-Utf8NoBom -Path $JsRunnerPath -Content $Js
  } else {
    Write-Host "[OK] Runner Node ja usa safeKind."
  }
} else {
  Write-Host "[AVISO] Runner Node nao encontrado ainda: $JsRunnerPath" -ForegroundColor Yellow
}

# 3) Build API para garantir que o backend ficou compilavel.
Set-Location $ApiRoot
Write-Host "[INFO] Rodando build da API..."
npm run build *> log-api-fix-refund60-config-build.txt

$BuildLogPath = Join-Path $ApiRoot "log-api-fix-refund60-config-build.txt"
$Errors = Select-String -Path $BuildLogPath -Pattern "error|Error:|Failed|Cannot find|Type error|Module not found|getCancellationConfig|REFUND_60|WALLET_80|Prisma" -Context 2,3

if ($Errors) {
  Write-Host "[AVISO] Build gerou linhas filtradas. Veja abaixo:" -ForegroundColor Yellow
  $Errors | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "[OK] Build sem erros filtrados."
}

Write-Host ""
Write-Host "[OK] Correcao aplicada."
Write-Host ""
Write-Host "Agora reinicie a API e rode o teste Node de novo:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-cancellation-deep-real-api-tests-node.ps1"

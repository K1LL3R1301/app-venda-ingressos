$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"

$OperatorSupportPath = Join-Path $WebRoot "src\app\operator\support\page.tsx"
$OperatorSupportNewPath = Join-Path $WebRoot "src\app\operator\support\new\page.tsx"

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

  if (!(Test-Path -LiteralPath $Path)) {
    throw "Arquivo nao encontrado: $Path"
  }

  $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $BackupPath = "$Path.bak-fix-operator-support-hydration-$Stamp"
  Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
  Write-Host "[OK] Backup criado: $BackupPath"
}

function Fix-OperatorSupportPage {
  Backup-File $OperatorSupportPath

  $Text = [System.IO.File]::ReadAllText($OperatorSupportPath)

  # Nao pode ler window/localStorage dentro do useState inicial, porque o SSR renderiza
  # "Evento operacional" e o cliente renderiza o evento real antes de hidratar.
  $Text = $Text.Replace(
    'const [info, setInfo] = useState(eventInfo);',
    'const [info, setInfo] = useState({ eventId: "", eventName: "Evento operacional" });'
  )

  $Text = $Text.Replace(
    'const [eventInfo, setEventInfo] = useState(readEventInfo);',
    'const [eventInfo, setEventInfo] = useState({ eventId: "", eventName: "Evento operacional" });'
  )

  $Text = $Text.Replace(
    'useState(() => eventInfo())',
    'useState({ eventId: "", eventName: "Evento operacional" })'
  )

  $Text = $Text.Replace(
    'useState(() => readEventInfo())',
    'useState({ eventId: "", eventName: "Evento operacional" })'
  )

  Write-Utf8NoBom -Path $OperatorSupportPath -Content $Text

  $Final = [System.IO.File]::ReadAllText($OperatorSupportPath)

  if ($Final -match 'useState\(eventInfo\)' -or $Final -match 'useState\(readEventInfo\)' -or $Final -match 'useState\(\(\)\s*=>\s*eventInfo\(\)\)' -or $Final -match 'useState\(\(\)\s*=>\s*readEventInfo\(\)\)') {
    throw "Ainda existe useState lendo window/localStorage no primeiro render em operator/support/page.tsx"
  }

  Write-Host "[OK] /operator/support sem leitura de window/localStorage no primeiro render."
}

function Fix-OperatorSupportNewPage {
  if (!(Test-Path -LiteralPath $OperatorSupportNewPath)) {
    Write-Host "[AVISO] /operator/support/new nao encontrado. Pulando." -ForegroundColor Yellow
    return
  }

  Backup-File $OperatorSupportNewPath

  $Text = [System.IO.File]::ReadAllText($OperatorSupportNewPath)

  # Remove leitura de URL/window no corpo do componente.
  $Text = [System.Text.RegularExpressions.Regex]::Replace(
    $Text,
    '(?ms)const\s+initial\s*=\s*readInitialParams\(\);\s*',
    ''
  )

  $Text = [System.Text.RegularExpressions.Regex]::Replace(
    $Text,
    '(?ms)const\s+event\s*=\s*readEvent\(\);\s*',
    ''
  )

  $Text = $Text.Replace(
    'const [selectedEventId, setSelectedEventId] = useState(initial.eventId);',
    'const [selectedEventId, setSelectedEventId] = useState("");'
  )

  $Text = $Text.Replace(
    'const [selectedEventName, setSelectedEventName] = useState(initial.eventName);',
    'const [selectedEventName, setSelectedEventName] = useState("");'
  )

  $Text = $Text.Replace(
    'eventId: event.eventId,',
    'eventId: "",'
  )

  $Text = $Text.Replace(
    'eventName: event.eventName,',
    'eventName: "",'
  )

  $Text = $Text.Replace(
    'eventId: initial.eventId,',
    'eventId: "",'
  )

  $Text = $Text.Replace(
    'eventName: initial.eventName,',
    'eventName: "",'
  )

  if ($Text -match 'const params = readInitialParams\(\);') {
    Write-Host "[OK] /operator/support/new ja carrega parametros dentro do useEffect."
  } elseif ($Text -match 'async function load\(\)') {
    $Text = $Text.Replace(
      'async function load() {',
      'async function load() {' + "`r`n" + '      const params = readInitialParams();' + "`r`n" + '      if (params.eventId) {' + "`r`n" + '        setSelectedEventId(params.eventId);' + "`r`n" + '        setSelectedEventName(params.eventName || params.eventId);' + "`r`n" + '      }'
    )
  }

  Write-Utf8NoBom -Path $OperatorSupportNewPath -Content $Text

  $Final = [System.IO.File]::ReadAllText($OperatorSupportNewPath)

  if ($Final -match 'const\s+initial\s*=\s*readInitialParams\(\)' -or $Final -match 'const\s+event\s*=\s*readEvent\(\)') {
    throw "Ainda existe leitura de URL/window no corpo do componente em operator/support/new/page.tsx"
  }

  Write-Host "[OK] /operator/support/new sem leitura de URL/window no primeiro render."
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Corrigindo hydration mismatch do suporte do operador"

Fix-OperatorSupportPage
Fix-OperatorSupportNewPage

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
Write-Host "[OK] Hydration do suporte do operador corrigida."
Write-Host ""
Write-Host "Agora rode:"
Write-Host "cd `"$WebRoot`""
Write-Host "npm run build *> log-web-operator-support-hydration-build.txt"
Write-Host "Select-String -Path .\log-web-operator-support-hydration-build.txt -Pattern `"error|Error:|Failed|Cannot find|Type error|Module not found|Hydration|operator/support|operator/support/new|eventInfo|readInitialParams|readEvent`" -Context 2,3"

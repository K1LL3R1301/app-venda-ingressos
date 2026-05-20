$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$SuperSupportPath = Join-Path $WebRoot "src\app\admin\super\support\page.tsx"

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
  $BackupPath = "$Path.bak-remove-super-return-buttons-$Stamp"
  Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
  Write-Host "[OK] Backup criado: $BackupPath"
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Removendo botoes Devolver cliente/produtor/operador do Suporte Site"

Backup-File $SuperSupportPath

$Text = [System.IO.File]::ReadAllText($SuperSupportPath)

# Remove os 3 botoes marcados: Devolver cliente, Devolver produtor e Devolver operador.
$Patterns = @(
  '(?ms)\s*<button\s+type="button"\s+onClick=\{\(\)\s*=>\s*returnTo\("CUSTOMER"\)\}.*?</button>',
  '(?ms)\s*<button\s+type="button"\s+onClick=\{\(\)\s*=>\s*returnTo\("PRODUCER"\)\}.*?</button>',
  '(?ms)\s*<button\s+type="button"\s+onClick=\{\(\)\s*=>\s*returnTo\("OPERATOR"\)\}.*?</button>'
)

foreach ($Pattern in $Patterns) {
  $Text = [System.Text.RegularExpressions.Regex]::Replace($Text, $Pattern, "")
}

# Fallback caso o JSX esteja com quebras/espacos diferentes: remove botoes pelo texto visivel.
$ButtonLabels = @("Devolver cliente", "Devolver produtor", "Devolver operador")
foreach ($Label in $ButtonLabels) {
  $Escaped = [System.Text.RegularExpressions.Regex]::Escape($Label)
  $Text = [System.Text.RegularExpressions.Regex]::Replace(
    $Text,
    "(?ms)\s*<button\b(?:(?!</button>).)*?$Escaped(?:(?!</button>).)*?</button>",
    ""
  )
}

# Remove a funcao returnTo se ficou sem uso.
$Text = [System.Text.RegularExpressions.Regex]::Replace(
  $Text,
  '(?ms)\s*async function returnTo\([^)]*\)\s*\{.*?\n\s*\}\s*\n\s*async function closeTicket',
  "`r`n  async function closeTicket"
)

# Ajusta o texto do rodape para deixar claro que tudo e visivel para todos.
$Text = $Text.Replace(
  "Todas as mensagens ficam visíveis para todos os envolvidos no chamado.",
  "Todas as mensagens ficam visíveis para todos os envolvidos no chamado. O Suporte Site responde no chat ou resolve o técnico."
)

# Evita excesso de linhas vazias.
$Text = [System.Text.RegularExpressions.Regex]::Replace($Text, "(`r?`n){5,}", "`r`n`r`n`r`n")

Write-Utf8NoBom -Path $SuperSupportPath -Content $Text

$Final = [System.IO.File]::ReadAllText($SuperSupportPath)

if ($Final -match 'Devolver cliente' -or $Final -match 'Devolver produtor' -or $Final -match 'Devolver operador') {
  throw "Ainda encontrei algum botao Devolver no arquivo do Suporte Site."
}

Write-Host "[OK] Botoes Devolver removidos."
Write-Host "[OK] Botao Resolver tecnico mantido."

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
Write-Host "[OK] Suporte Site ajustado."
Write-Host ""
Write-Host "Agora rode:"
Write-Host "cd `"$WebRoot`""
Write-Host "npm run build *> log-web-super-support-remove-buttons-build.txt"
Write-Host "Select-String -Path .\log-web-super-support-remove-buttons-build.txt -Pattern `"error|Error:|Failed|Cannot find|Type error|Module not found|admin/super/support|Devolver cliente|Devolver produtor|Devolver operador|returnTo|Resolver tecnico`" -Context 2,3"

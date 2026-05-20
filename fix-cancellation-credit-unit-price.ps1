$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunnerPath = Join-Path $ProjectRoot "run-cancellation-credit-real-api-tests.ps1"

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
Write-Host "[INFO] Corrigindo calculo do valor do credito no teste de cancelamento"

if (!(Test-Path -LiteralPath $RunnerPath)) {
  throw "Nao encontrei o arquivo: $RunnerPath"
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupPath = "$RunnerPath.bak-fix-unit-price-$Stamp"
Copy-Item -LiteralPath $RunnerPath -Destination $BackupPath -Force
Write-Host "[OK] Backup criado: $BackupPath"

$Text = [System.IO.File]::ReadAllText($RunnerPath)

$Helper = @'

function Get-TicketUnitPrice {
  param(
    [object] $Order,
    [string] $TicketId
  )

  if ($null -eq $Order -or $null -eq $Order.items) {
    return 0
  }

  foreach ($item in @($Order.items)) {
    if ($null -eq $item) {
      continue
    }

    foreach ($ticket in @($item.tickets)) {
      if ([string]$ticket.id -eq [string]$TicketId) {
        $unit = To-DecimalNumber $item.unitPrice

        if ($unit -gt 0) {
          return $unit
        }

        $total = To-DecimalNumber $item.totalPrice
        $quantity = [decimal]$item.quantity

        if ($total -gt 0 -and $quantity -gt 0) {
          return [decimal]::Round(($total / $quantity), 2)
        }
      }
    }
  }

  $orderTotal = To-DecimalNumber $Order.totalAmount
  if ($orderTotal -gt 0) {
    return $orderTotal
  }

  return 0
}

'@

if ($Text -notmatch 'function Get-TicketUnitPrice') {
  $Text = $Text.Replace('function Resolve-OrderResponse {', $Helper + 'function Resolve-OrderResponse {')
  Write-Host "[OK] Helper Get-TicketUnitPrice inserido."
} else {
  Write-Host "[OK] Helper Get-TicketUnitPrice ja existia."
}

$Old = 'unitPrice = To-DecimalNumber $ticket.orderItem.unitPrice'
$New = 'unitPrice = Get-TicketUnitPrice -Order $paidOrder -TicketId $ticket.id'

if ($Text.Contains($Old)) {
  $Text = $Text.Replace($Old, $New)
  Write-Host "[OK] unitPrice agora e calculado pelo item do pedido."
} else {
  Write-Host "[AVISO] Linha antiga de unitPrice nao encontrada. Vou tentar regex." -ForegroundColor Yellow

  $Pattern = 'unitPrice\s*=\s*To-DecimalNumber\s+\$ticket\.orderItem\.unitPrice'
  $NextText = [System.Text.RegularExpressions.Regex]::Replace($Text, $Pattern, $New)

  if ($NextText -eq $Text) {
    throw "Nao consegui substituir o calculo antigo de unitPrice."
  }

  $Text = $NextText
  Write-Host "[OK] unitPrice corrigido por regex."
}

Write-Utf8NoBom -Path $RunnerPath -Content $Text

$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile($RunnerPath, [ref]$tokens, [ref]$errors) | Out-Null

if ($errors -and $errors.Count -gt 0) {
  Write-Host "[ERRO] Ainda existem erros de sintaxe:" -ForegroundColor Red
  foreach ($err in $errors) {
    Write-Host " - Linha $($err.Extent.StartLineNumber): $($err.Message)" -ForegroundColor Red
  }
  throw "run-cancellation-credit-real-api-tests.ps1 ainda tem erro de sintaxe."
}

Write-Host "[OK] Sintaxe PowerShell validada."

Write-Host ""
Write-Host "[OK] Runner de cancelamento corrigido."
Write-Host ""
Write-Host "Agora rode novamente:"
Write-Host "cd `"$ProjectRoot`""
Write-Host "powershell -ExecutionPolicy Bypass -File .\run-cancellation-credit-real-api-tests.ps1"

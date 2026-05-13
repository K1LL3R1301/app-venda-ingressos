# aplicar-v69-limpar-menu-super-admin-suporte.ps1
# Limpa o menu do SUPER_ADMIN.
#
# Remove do menu:
# - Solicitações de criador
# - Solicitacoes de criador
# - Atendimentos
# - links antigos para /admin/support?tab=admin-requests
# - links antigos para /admin/support/admin-requests
#
# Mantem apenas uma opção:
# - Suporte -> /admin/support
#
# Rode na raiz do projeto plataforma-ingressos.

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$HeaderPath = Join-Path $Root "apps\web\src\components\customer\CustomerHeader.tsx"

if (-not (Test-Path $HeaderPath)) {
  throw "Arquivo nao encontrado: apps\web\src\components\customer\CustomerHeader.tsx"
}

$Content = Get-Content $HeaderPath -Raw
$Original = $Content

$Backup = "$HeaderPath.bak-v69-$Stamp"
Copy-Item $HeaderPath $Backup -Force
Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray

# Normaliza links antigos para a tela unica de suporte.
$Content = $Content.Replace('/admin/support?tab=admin-requests', '/admin/support')
$Content = $Content.Replace('/admin/support/admin-requests', '/admin/support')

# Remove objetos inteiros do array do menu que nao devem mais aparecer.
# Exemplo removido:
# { label: "Solicitações de criador", href: "/admin/support" },
# { label: "Atendimentos", href: "/admin/support" },
$Content = [regex]::Replace(
  $Content,
  '\s*\{\s*label:\s*"(Solicitações de criador|Solicitacoes de criador|Atendimentos)"\s*,\s*href:\s*"/admin/support"\s*\},?',
  '',
  'IgnoreCase'
)

$Content = [regex]::Replace(
  $Content,
  "\s*\{\s*label:\s*'(Solicitações de criador|Solicitacoes de criador|Atendimentos)'\s*,\s*href:\s*'/admin/support'\s*\},?",
  '',
  'IgnoreCase'
)

# Remove qualquer linha simples restante com esses nomes, caso esteja formatada diferente.
$Lines = $Content -split "`r?`n"
$Filtered = New-Object System.Collections.Generic.List[string]

foreach ($Line in $Lines) {
  if ($Line -match 'Solicitaç|Solicitac|Atendimentos') {
    continue
  }

  $Filtered.Add($Line)
}

$Content = ($Filtered -join "`r`n")

# Garante que exista exatamente uma opção Suporte no menu admin/super admin.
# Primeiro remove duplicadas de Suporte dentro dos arrays.
$Content = [regex]::Replace(
  $Content,
  '(\s*\{\s*label:\s*"Suporte"\s*,\s*href:\s*"/admin/support"\s*\},?\s*){2,}',
  "`r`n    { label: `"Suporte`", href: `"/admin/support`" },`r`n",
  'IgnoreCase'
)

# Se nao existir Suporte, adiciona depois de Pedidos.
if ($Content -notmatch 'label:\s*"Suporte"\s*,\s*href:\s*"/admin/support"') {
  $Content = $Content.Replace(
    '{ label: "Pedidos", href: "/admin/orders" },',
    '{ label: "Pedidos", href: "/admin/orders" },' + "`r`n" + '    { label: "Suporte", href: "/admin/support" },'
  )
}

# Remove eventuais linhas vazias em excesso dentro dos arrays.
$Content = [regex]::Replace($Content, "(`r?`n){3,}", "`r`n`r`n")

if ($Content -eq $Original) {
  Write-Host "Nenhuma alteracao detectada. Talvez o menu ja estivesse limpo." -ForegroundColor Yellow
} else {
  Set-Content -Path $HeaderPath -Value $Content -Encoding UTF8
  Write-Host "Menu limpo com sucesso." -ForegroundColor Green
}

Write-Host ""
Write-Host "v69 aplicada com sucesso." -ForegroundColor Green
Write-Host "Agora o menu deve manter somente a opcao Suporte, removendo Solicitacoes de criador e Atendimentos." -ForegroundColor Cyan
Write-Host ""
Write-Host "Reinicie o WEB:" -ForegroundColor Cyan
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\web"' -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor Cyan

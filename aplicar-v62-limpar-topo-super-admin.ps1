# aplicar-v62-limpar-topo-super-admin.ps1
# Remove do TOPO do SUPER_ADMIN:
# - Painel Admin
# - Solicitacoes
#
# Mantem no menu da bolinha "S":
# - Painel administrativo
# - Solicitacoes de criador
#
# Tambem evita quebra de linha nos botoes do topo.
# Nao mexe na dashboard.

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$HeaderPath = Join-Path $Root "apps\web\src\components\customer\CustomerHeader.tsx"

if (-not (Test-Path $HeaderPath)) {
  throw "Arquivo nao encontrado: apps\web\src\components\customer\CustomerHeader.tsx"
}

$Content = Get-Content $HeaderPath -Raw
$Original = $Content

$Backup = "$HeaderPath.bak-v62-$Stamp"
Copy-Item $HeaderPath $Backup -Force
Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray

# 1) Remove Painel Admin e Solicitacoes SOMENTE do array do topo do SUPER_ADMIN.
$Pattern = "const superAdminTopItems: HeaderMenuItem\[\] = \[[\s\S]*?\];"
$Replacement = @'
const superAdminTopItems: HeaderMenuItem[] = [
    { label: "Criar evento", href: "/admin/events/new" },
    { label: "Meus ingressos", href: "/orders" },
  ];
'@

if ($Content -match $Pattern) {
  $Content = [regex]::Replace($Content, $Pattern, $Replacement, 1)
  Write-Host "Topo do SUPER_ADMIN limpo." -ForegroundColor Green
} else {
  Write-Host "Aviso: nao encontrei superAdminTopItems. Tentando remover itens individualmente..." -ForegroundColor Yellow
  $Content = $Content.Replace('    { label: "Painel Admin", href: "/admin/dashboard" },' + "`r`n", "")
  $Content = $Content.Replace('    { label: "Solicitações", href: "/admin/support/admin-requests" },' + "`r`n", "")
  $Content = $Content.Replace('    { label: "Solicitacoes", href: "/admin/support/admin-requests" },' + "`r`n", "")
}

# 2) Evita quebrar "Criar evento" e "Meus ingressos" em duas linhas.
$Content = $Content.Replace(
  '    ? "text-sm font-black text-[#19002f]"',
  '    ? "whitespace-nowrap text-sm font-black text-[#19002f]"'
)

$Content = $Content.Replace(
  '    : "text-sm font-black text-[#19002f]/80 hover:text-[#19002f]";',
  '    : "whitespace-nowrap text-sm font-black text-[#19002f]/80 hover:text-[#19002f]";'
)

# 3) Garante que o topo ainda tenha espaçamento bom.
$Content = $Content.Replace('className="ml-auto hidden items-center gap-6 md:flex"', 'className="ml-auto hidden items-center gap-8 md:flex"')

if ($Content -eq $Original) {
  Write-Host "Nenhuma alteracao feita. O arquivo talvez ja esteja corrigido." -ForegroundColor Yellow
} else {
  Set-Content -Path $HeaderPath -Value $Content -Encoding UTF8
  Write-Host "Atualizado: apps\web\src\components\customer\CustomerHeader.tsx" -ForegroundColor Green
}

Write-Host ""
Write-Host "v62 aplicada com sucesso." -ForegroundColor Green
Write-Host "O topo do SUPER_ADMIN agora fica apenas com Criar evento e Meus ingressos." -ForegroundColor Cyan
Write-Host "Painel Admin e Solicitacoes continuam dentro do menu da bolinha S." -ForegroundColor Cyan
Write-Host ""
Write-Host "Agora reinicie o WEB:" -ForegroundColor Cyan
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\web"' -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor Cyan

# aplicar-v60-super-admin-total.ps1
# Cria o papel SUPER_ADMIN com tudo liberado.
#
# Regras finais:
# - SUPER_ADMIN = conta mestre/moderadora, com acesso total.
# - ADMIN = produtor/aprovado para criar eventos.
# - CUSTOMER/OPERATOR = precisam abrir chamado para virar ADMIN.
# - Somente SUPER_ADMIN ve e aprova/reprova chamados de liberacao.
# - Ao aprovar um chamado, o usuario vira ADMIN, nao SUPER_ADMIN.
#
# Uso:
# powershell -ExecutionPolicy Bypass -File ".\aplicar-v60-super-admin-total.ps1" -SuperAdminEmail "email@exemplo.com"
#
# Se nao passar -SuperAdminEmail, o script pergunta.

param(
  [string]$SuperAdminEmail = ""
)

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Backup-File($Path) {
  if (Test-Path $Path) {
    $Backup = "$Path.bak-v60-$Stamp"
    Copy-Item $Path $Backup -Force
    Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray
  }
}

function Write-File($Path, $Content) {
  $Dir = Split-Path $Path -Parent
  if (-not (Test-Path $Dir)) {
    New-Item -ItemType Directory -Path $Dir -Force | Out-Null
  }

  Backup-File $Path
  Set-Content -Path $Path -Value $Content -Encoding UTF8
  Write-Host "Atualizado: $Path" -ForegroundColor Green
}

function Patch-FileReplace($Path, $Pairs) {
  if (-not (Test-Path $Path)) {
    Write-Host "Aviso: arquivo nao encontrado: $Path" -ForegroundColor Yellow
    return
  }

  $Content = Get-Content $Path -Raw
  $Original = $Content

  foreach ($Pair in $Pairs) {
    $Content = $Content.Replace($Pair.Old, $Pair.New)
  }

  if ($Content -ne $Original) {
    Backup-File $Path
    Set-Content -Path $Path -Value $Content -Encoding UTF8
    Write-Host "Patch aplicado: $Path" -ForegroundColor Green
  } else {
    Write-Host "Nada para alterar em: $Path" -ForegroundColor Yellow
  }
}

function Patch-RolesGuard() {
  $Path = Join-Path $Root "apps\api\src\common\guards\roles.guard.ts"

  if (-not (Test-Path $Path)) {
    throw "RolesGuard nao encontrado em apps\api\src\common\guards\roles.guard.ts"
  }

  $Content = Get-Content $Path -Raw

  if ($Content -match "user\.role\s*===\s*'SUPER_ADMIN'") {
    Write-Host "RolesGuard ja libera SUPER_ADMIN." -ForegroundColor Yellow
    return
  }

  $Needle = @'
    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

'@

  $Insert = @'
    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

'@

  if ($Content -notlike "*$Needle*") {
    throw "Nao encontrei o ponto de insercao no RolesGuard."
  }

  Backup-File $Path
  $Content = $Content.Replace($Needle, $Insert)
  Set-Content -Path $Path -Value $Content -Encoding UTF8
  Write-Host "RolesGuard atualizado: SUPER_ADMIN agora passa em todas as rotas protegidas." -ForegroundColor Green
}

function Patch-AdminAccessController() {
  $Path = Join-Path $Root "apps\api\src\admin-access-requests\admin-access-requests.controller.ts"

  if (-not (Test-Path $Path)) {
    Write-Host "Aviso: controller de solicitacoes nao encontrado. Talvez a v58 ainda nao tenha sido aplicada." -ForegroundColor Yellow
    return
  }

  $Content = Get-Content $Path -Raw
  $Original = $Content

  # Somente SUPER_ADMIN pode listar/ver/revisar as solicitacoes.
  # Mantem create para CUSTOMER/OPERATOR.
  $Content = $Content.Replace("@Roles('ADMIN')", "@Roles('SUPER_ADMIN')")
  $Content = $Content.Replace("@Roles('CUSTOMER', 'OPERATOR', 'ADMIN')", "@Roles('CUSTOMER', 'OPERATOR', 'ADMIN', 'SUPER_ADMIN')")

  if ($Content -ne $Original) {
    Backup-File $Path
    Set-Content -Path $Path -Value $Content -Encoding UTF8
    Write-Host "Controller atualizado: moderacao agora exige SUPER_ADMIN." -ForegroundColor Green
  } else {
    Write-Host "Controller de solicitacoes ja parece atualizado." -ForegroundColor Yellow
  }
}

function Patch-AdminAccessService() {
  $Path = Join-Path $Root "apps\api\src\admin-access-requests\admin-access-requests.service.ts"

  if (-not (Test-Path $Path)) {
    Write-Host "Aviso: service de solicitacoes nao encontrado." -ForegroundColor Yellow
    return
  }

  $Content = Get-Content $Path -Raw
  $Original = $Content

  # SUPER_ADMIN tambem nao deve abrir solicitacao, porque ja e superior.
  $Content = $Content.Replace(
    "if (String(user.role || '').toUpperCase() === 'ADMIN') {",
    "if (['ADMIN', 'SUPER_ADMIN'].includes(String(user.role || '').toUpperCase())) {"
  )

  # Garantia: aprovacao continua virando ADMIN, nao SUPER_ADMIN.
  $Content = $Content.Replace("role: 'SUPER_ADMIN',", "role: 'ADMIN',")

  if ($Content -ne $Original) {
    Backup-File $Path
    Set-Content -Path $Path -Value $Content -Encoding UTF8
    Write-Host "Service atualizado: aprovacao vira ADMIN e SUPER_ADMIN nao abre pedido." -ForegroundColor Green
  } else {
    Write-Host "Service ja parece atualizado." -ForegroundColor Yellow
  }
}

function Patch-CustomerHeader() {
  $Path = Join-Path $Root "apps\web\src\components\customer\CustomerHeader.tsx"

  if (-not (Test-Path $Path)) {
    Write-Host "Aviso: CustomerHeader nao encontrado." -ForegroundColor Yellow
    return
  }

  $Content = Get-Content $Path -Raw
  $Original = $Content

  # Remove Meus eventos do topo customer, caso ainda exista.
  $Content = $Content.Replace(
@'
  const customerTopItems: HeaderMenuItem[] = [
    { label: "Criar evento", href: "/admin/events/new" },
    { label: "Meus eventos", href: "/admin/events" },
    { label: "Meus ingressos", href: "/orders" },
  ];
'@,
@'
  const customerTopItems: HeaderMenuItem[] = [
    { label: "Criar evento", href: "/admin/events/new" },
    { label: "Meus ingressos", href: "/orders" },
  ];
'@
  )

  # ADMIN e SUPER_ADMIN acessam area admin/criar evento.
  $Content = $Content.Replace(
    'const canAccessAdmin = normalizedRole === "ADMIN";',
    'const canAccessAdmin = normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN";'
  )

  $Content = $Content.Replace(
    "const canAccessAdmin = normalizedRole === 'ADMIN';",
    "const canAccessAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN';"
  )

  # Corrige caminho do Criar Evento no clique.
  $Content = $Content.Replace(
@'
    if (currentRole === "ADMIN") return "/admin/events/new";
'@,
@'
    if (currentRole === "ADMIN" || currentRole === "SUPER_ADMIN") return "/admin/events/new";
'@
  )

  $Content = $Content.Replace(
@'
    if (currentRole === 'ADMIN') return '/admin/events/new';
'@,
@'
    if (currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN') return '/admin/events/new';
'@
  )

  # Se ainda nao existir funcao de clique do criar evento, injeta uma versao segura.
  if ($Content -notmatch "function handleCreateEventClick") {
    $Insert = @'

  function getCurrentUserRole() {
    const propRole = String(user?.role || "").toUpperCase();

    if (propRole) return propRole;

    try {
      const rawUser = localStorage.getItem("user");
      const storedUser = rawUser ? (JSON.parse(rawUser) as CustomerHeaderUser) : null;

      return String(storedUser?.role || "").toUpperCase();
    } catch {
      return "";
    }
  }

  function getCreateEventPath() {
    const currentRole = getCurrentUserRole();

    if (currentRole === "ADMIN" || currentRole === "SUPER_ADMIN") return "/admin/events/new";

    return "/support/admin-request";
  }

  function handleCreateEventClick() {
    setMenuOpen(false);
    window.location.assign(getCreateEventPath());
  }

  function handleTopItemClick(item: HeaderMenuItem) {
    if (item.label === "Criar evento") {
      handleCreateEventClick();
      return;
    }

    handleGo(item.href);
  }

'@

    $Marker = "  function renderAdminMenu() {"
    if ($Content -like "*$Marker*") {
      $Content = $Content.Replace($Marker, $Insert + $Marker)
    } else {
      Write-Host "Aviso: nao encontrei renderAdminMenu para injetar clique seguro." -ForegroundColor Yellow
    }
  }

  $Content = $Content.Replace('onClick={() => goTo(item.href)}', 'onClick={() => handleTopItemClick(item)}')

  if ($Content -ne $Original) {
    Backup-File $Path
    Set-Content -Path $Path -Value $Content -Encoding UTF8
    Write-Host "Header atualizado para ADMIN/SUPER_ADMIN." -ForegroundColor Green
  } else {
    Write-Host "Header ja parece atualizado." -ForegroundColor Yellow
  }
}

function Patch-AdminNewEventGuard() {
  $Path = Join-Path $Root "apps\web\src\app\admin\events\new\page.tsx"

  if (-not (Test-Path $Path)) {
    Write-Host "Aviso: pagina de criar evento nao encontrada." -ForegroundColor Yellow
    return
  }

  $Content = Get-Content $Path -Raw
  $Original = $Content

  # Se a guarda v59 existe, permite SUPER_ADMIN tambem.
  $Content = $Content.Replace(
    'if (role !== "ADMIN") {',
    'if (role !== "ADMIN" && role !== "SUPER_ADMIN") {'
  )

  # Se nao existe guarda, cria.
  if ($Content -notmatch "v60-admin-create-event-guard" -and $Content -notmatch "v59-admin-create-event-guard") {
    $Guard = @'
  // v60-admin-create-event-guard
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user");
      const storedUser = rawUser ? JSON.parse(rawUser) : null;
      const role = String(storedUser?.role || "").toUpperCase();

      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        window.location.replace("/support/admin-request");
      }
    } catch {
      window.location.replace("/support/admin-request");
    }
  }, []);

'@

    $Pattern = "export\s+default\s+function\s+[^\(]+\([^\)]*\)\s*\{"
    if ($Content -match $Pattern) {
      $Content = [regex]::Replace($Content, $Pattern, { param($m) $m.Value + "`r`n" + $Guard }, 1)
    } else {
      Write-Host "Aviso: nao consegui injetar guarda na pagina de criar evento." -ForegroundColor Yellow
    }
  }

  if ($Content -ne $Original) {
    Backup-File $Path
    Set-Content -Path $Path -Value $Content -Encoding UTF8
    Write-Host "Criar evento agora permite ADMIN e SUPER_ADMIN, e bloqueia o resto." -ForegroundColor Green
  } else {
    Write-Host "Criar evento ja parece atualizado." -ForegroundColor Yellow
  }
}

function Patch-ModeratorPage() {
  $Path = Join-Path $Root "apps\web\src\app\admin\support\admin-requests\page.tsx"

  if (-not (Test-Path $Path)) {
    Write-Host "Aviso: pagina do moderador nao encontrada." -ForegroundColor Yellow
    return
  }

  $Content = Get-Content $Path -Raw
  $Original = $Content

  $Content = $Content.Replace(
    'String(user?.role || "").toUpperCase() === "ADMIN"',
    'String(user?.role || "").toUpperCase() === "SUPER_ADMIN"'
  )

  $Content = $Content.Replace(
    "String(user?.role || '').toUpperCase() === 'ADMIN'",
    "String(user?.role || '').toUpperCase() === 'SUPER_ADMIN'"
  )

  $Content = $Content.Replace("Apenas administradores podem acessar o suporte do moderador.", "Apenas super administradores podem acessar o suporte do moderador.")
  $Content = $Content.Replace("Moderador/Admin", "Super Admin")
  $Content = $Content.Replace("moderador/admin", "super administrador")
  $Content = $Content.Replace("O moderador pode aprovar ou reprovar.", "O super administrador pode aprovar ou reprovar.")

  if ($Content -ne $Original) {
    Backup-File $Path
    Set-Content -Path $Path -Value $Content -Encoding UTF8
    Write-Host "Tela do moderador agora exige SUPER_ADMIN." -ForegroundColor Green
  } else {
    Write-Host "Tela do moderador ja parece atualizada." -ForegroundColor Yellow
  }
}

function Create-SuperAdminScriptAndRun() {
  if ([string]::IsNullOrWhiteSpace($SuperAdminEmail)) {
    $SuperAdminEmail = Read-Host "Digite o e-mail da conta que deve virar SUPER_ADMIN"
  }

  if ([string]::IsNullOrWhiteSpace($SuperAdminEmail)) {
    Write-Host "Nenhum e-mail informado. Pulando promocao de SUPER_ADMIN." -ForegroundColor Yellow
    return
  }

  $ApiPath = Join-Path $Root "apps\api"

  if (-not (Test-Path $ApiPath)) {
    throw "Pasta apps\api nao encontrada."
  }

  $ScriptDir = Join-Path $ApiPath ".tmp"
  if (-not (Test-Path $ScriptDir)) {
    New-Item -ItemType Directory -Path $ScriptDir -Force | Out-Null
  }

  $NodeScriptPath = Join-Path $ScriptDir "make-super-admin-v60.js"

  $NodeScript = @'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    throw new Error('Informe o e-mail da conta que deve virar SUPER_ADMIN.');
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(`Usuario nao encontrado com e-mail: ${email}`);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: 'SUPER_ADMIN' },
  });

  console.log(JSON.stringify({
    ok: true,
    id: updated.id,
    email: updated.email,
    role: updated.role,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
'@

  Set-Content -Path $NodeScriptPath -Value $NodeScript -Encoding UTF8

  Push-Location $ApiPath

  try {
    Write-Host ""
    Write-Host "Promovendo conta para SUPER_ADMIN: $SuperAdminEmail" -ForegroundColor Cyan
    node ".tmp\make-super-admin-v60.js" "$SuperAdminEmail"

    if ($LASTEXITCODE -ne 0) {
      throw "Nao consegui promover a conta para SUPER_ADMIN. Verifique se o e-mail existe no banco."
    }

    Write-Host "Conta promovida para SUPER_ADMIN." -ForegroundColor Green
  }
  finally {
    Pop-Location
  }
}

Write-Host "Aplicando v60 - SUPER_ADMIN total..." -ForegroundColor Cyan

Patch-RolesGuard
Patch-AdminAccessController
Patch-AdminAccessService
Patch-CustomerHeader
Patch-AdminNewEventGuard
Patch-ModeratorPage
Create-SuperAdminScriptAndRun

Write-Host ""
Write-Host "v60 aplicada com sucesso." -ForegroundColor Green
Write-Host ""
Write-Host "Resumo das regras:" -ForegroundColor Cyan
Write-Host "- SUPER_ADMIN: acesso total e aprova/reprova pedidos." -ForegroundColor Cyan
Write-Host "- ADMIN: produtor aprovado, pode criar eventos." -ForegroundColor Cyan
Write-Host "- CUSTOMER/OPERATOR: abre chamado para virar ADMIN." -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "Depois de promover a conta, saia e entre novamente no site para atualizar token/localStorage." -ForegroundColor Yellow
Write-Host ""
Write-Host "Reinicie API e WEB:" -ForegroundColor Cyan
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\api"' -ForegroundColor Cyan
Write-Host "npm run start:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\web"' -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor Cyan

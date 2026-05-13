# aplicar-v60b-super-admin-total-corrigido.ps1
# Corrige a v60 quando aparece:
# "Nao encontrei o ponto de insercao no RolesGuard."
#
# Este script NAO depende do formato atual do RolesGuard:
# ele substitui o RolesGuard por uma versao segura com SUPER_ADMIN liberado em tudo.
#
# Regras finais:
# - SUPER_ADMIN = conta mestre/moderadora, tudo liberado.
# - ADMIN = produtor aprovado, pode criar eventos.
# - CUSTOMER/OPERATOR = abre chamado para virar ADMIN.
# - Somente SUPER_ADMIN ve/aprova/reprova chamados.
# - Ao aprovar um chamado, usuario vira ADMIN, nunca SUPER_ADMIN.
#
# Uso:
# powershell -ExecutionPolicy Bypass -File ".\aplicar-v60b-super-admin-total-corrigido.ps1" -SuperAdminEmail "email@exemplo.com"

param(
  [string]$SuperAdminEmail = ""
)

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Backup-File($Path) {
  if (Test-Path $Path) {
    $Backup = "$Path.bak-v60b-$Stamp"
    Copy-Item $Path $Backup -Force
    Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray
  }
}

function Write-TextFile($Path, $Content) {
  $Dir = Split-Path $Path -Parent

  if (-not (Test-Path $Dir)) {
    New-Item -ItemType Directory -Path $Dir -Force | Out-Null
  }

  Backup-File $Path
  Set-Content -Path $Path -Value $Content -Encoding UTF8
  Write-Host "Atualizado: $Path" -ForegroundColor Green
}

function Patch-RolesGuard-Safe() {
  $Path = Join-Path $Root "apps\api\src\common\guards\roles.guard.ts"

  if (-not (Test-Path $Path)) {
    throw "RolesGuard nao encontrado em apps\api\src\common\guards\roles.guard.ts"
  }

  $Content = @'
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const userRole = String(user.role || '').toUpperCase();

    if (userRole === 'SUPER_ADMIN') {
      return true;
    }

    const normalizedRequiredRoles = requiredRoles.map((role) =>
      String(role || '').toUpperCase(),
    );

    if (!normalizedRequiredRoles.includes(userRole)) {
      throw new ForbiddenException('Você não tem permissão para acessar esta rota');
    }

    return true;
  }
}
'@

  Write-TextFile $Path $Content
  Write-Host "RolesGuard corrigido: SUPER_ADMIN agora passa em todas as rotas com @Roles()." -ForegroundColor Green
}

function Patch-AdminAccessController() {
  $Path = Join-Path $Root "apps\api\src\admin-access-requests\admin-access-requests.controller.ts"

  if (-not (Test-Path $Path)) {
    Write-Host "Aviso: controller de solicitacoes nao encontrado. Pulei." -ForegroundColor Yellow
    return
  }

  $Content = Get-Content $Path -Raw
  $Original = $Content

  # listagem, detalhe e review devem ser SUPER_ADMIN
  $Content = $Content.Replace("@Roles('ADMIN')", "@Roles('SUPER_ADMIN')")
  $Content = $Content.Replace('@Roles("ADMIN")', '@Roles("SUPER_ADMIN")')

  # mine pode continuar para todos os perfis autenticados relevantes
  $Content = $Content.Replace(
    "@Roles('CUSTOMER', 'OPERATOR', 'ADMIN')",
    "@Roles('CUSTOMER', 'OPERATOR', 'ADMIN', 'SUPER_ADMIN')"
  )

  $Content = $Content.Replace(
    '@Roles("CUSTOMER", "OPERATOR", "ADMIN")',
    '@Roles("CUSTOMER", "OPERATOR", "ADMIN", "SUPER_ADMIN")'
  )

  if ($Content -ne $Original) {
    Backup-File $Path
    Set-Content -Path $Path -Value $Content -Encoding UTF8
    Write-Host "Controller de solicitacoes atualizado: moderacao exige SUPER_ADMIN." -ForegroundColor Green
  } else {
    Write-Host "Controller de solicitacoes ja parecia atualizado." -ForegroundColor Yellow
  }
}

function Patch-AdminAccessService() {
  $Path = Join-Path $Root "apps\api\src\admin-access-requests\admin-access-requests.service.ts"

  if (-not (Test-Path $Path)) {
    Write-Host "Aviso: service de solicitacoes nao encontrado. Pulei." -ForegroundColor Yellow
    return
  }

  $Content = Get-Content $Path -Raw
  $Original = $Content

  # SUPER_ADMIN tambem nao abre pedido.
  $Content = $Content.Replace(
    "if (String(user.role || '').toUpperCase() === 'ADMIN') {",
    "if (['ADMIN', 'SUPER_ADMIN'].includes(String(user.role || '').toUpperCase())) {"
  )

  $Content = $Content.Replace(
    'if (String(user.role || "").toUpperCase() === "ADMIN") {',
    'if (["ADMIN", "SUPER_ADMIN"].includes(String(user.role || "").toUpperCase())) {'
  )

  # Aprovacao continua virando ADMIN, nunca SUPER_ADMIN.
  $Content = $Content.Replace("role: 'SUPER_ADMIN',", "role: 'ADMIN',")
  $Content = $Content.Replace('role: "SUPER_ADMIN",', 'role: "ADMIN",')

  if ($Content -ne $Original) {
    Backup-File $Path
    Set-Content -Path $Path -Value $Content -Encoding UTF8
    Write-Host "Service atualizado: SUPER_ADMIN nao abre pedido e aprovacao vira ADMIN." -ForegroundColor Green
  } else {
    Write-Host "Service ja parecia atualizado." -ForegroundColor Yellow
  }
}

function Patch-CustomerHeader() {
  $Path = Join-Path $Root "apps\web\src\components\customer\CustomerHeader.tsx"

  if (-not (Test-Path $Path)) {
    Write-Host "Aviso: CustomerHeader nao encontrado. Pulei." -ForegroundColor Yellow
    return
  }

  $Content = Get-Content $Path -Raw
  $Original = $Content

  # Remove "Meus eventos" do topo customer, se ainda existir.
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

  # SUPER_ADMIN tambem e admin visualmente.
  $Content = $Content.Replace(
    'const canAccessAdmin = normalizedRole === "ADMIN";',
    'const canAccessAdmin = normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN";'
  )

  $Content = $Content.Replace(
    "const canAccessAdmin = normalizedRole === 'ADMIN';",
    "const canAccessAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN';"
  )

  # Corrige caminho do botao criar evento.
  $Content = $Content.Replace(
    'if (currentRole === "ADMIN") return "/admin/events/new";',
    'if (currentRole === "ADMIN" || currentRole === "SUPER_ADMIN") return "/admin/events/new";'
  )

  $Content = $Content.Replace(
    "if (currentRole === 'ADMIN') return '/admin/events/new';",
    "if (currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN') return '/admin/events/new';"
  )

  # Se ainda nao existe a funcao segura do botao Criar evento, injeta.
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
    Write-Host "Header ja parecia atualizado." -ForegroundColor Yellow
  }
}

function Patch-AdminNewEventGuard() {
  $Path = Join-Path $Root "apps\web\src\app\admin\events\new\page.tsx"

  if (-not (Test-Path $Path)) {
    Write-Host "Aviso: pagina de criar evento nao encontrada. Pulei." -ForegroundColor Yellow
    return
  }

  $Content = Get-Content $Path -Raw
  $Original = $Content

  # Se guarda antiga existe, libera SUPER_ADMIN tambem.
  $Content = $Content.Replace(
    'if (role !== "ADMIN") {',
    'if (role !== "ADMIN" && role !== "SUPER_ADMIN") {'
  )

  $Content = $Content.Replace(
    "if (role !== 'ADMIN') {",
    "if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {"
  )

  if ($Content -notmatch "v60b-admin-create-event-guard" -and $Content -notmatch "v59-admin-create-event-guard" -and $Content -notmatch "v60-admin-create-event-guard") {
    $Guard = @'
  // v60b-admin-create-event-guard
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
    Write-Host "Pagina de criar evento agora permite ADMIN/SUPER_ADMIN e bloqueia o resto." -ForegroundColor Green
  } else {
    Write-Host "Pagina de criar evento ja parecia atualizada." -ForegroundColor Yellow
  }
}

function Patch-ModeratorPage() {
  $Path = Join-Path $Root "apps\web\src\app\admin\support\admin-requests\page.tsx"

  if (-not (Test-Path $Path)) {
    Write-Host "Aviso: pagina do moderador nao encontrada. Pulei." -ForegroundColor Yellow
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

  $Content = $Content.Replace(
    "Apenas administradores podem acessar o suporte do moderador.",
    "Apenas super administradores podem acessar o suporte do moderador."
  )

  if ($Content -ne $Original) {
    Backup-File $Path
    Set-Content -Path $Path -Value $Content -Encoding UTF8
    Write-Host "Tela de moderacao agora exige SUPER_ADMIN." -ForegroundColor Green
  } else {
    Write-Host "Tela de moderacao ja parecia atualizada." -ForegroundColor Yellow
  }
}

function Promote-SuperAdmin() {
  if ([string]::IsNullOrWhiteSpace($SuperAdminEmail)) {
    $SuperAdminEmail = Read-Host "Digite o e-mail REAL da conta que deve virar SUPER_ADMIN"
  }

  if ([string]::IsNullOrWhiteSpace($SuperAdminEmail)) {
    Write-Host "Nenhum e-mail informado. Pulando promocao de SUPER_ADMIN." -ForegroundColor Yellow
    return
  }

  if ($SuperAdminEmail -match "SEUEMAILAQUI") {
    throw "Troque SEUEMAILAQUI@email.com pelo e-mail real da conta que deve virar SUPER_ADMIN."
  }

  $ApiPath = Join-Path $Root "apps\api"

  if (-not (Test-Path $ApiPath)) {
    throw "Pasta apps\api nao encontrada."
  }

  $ScriptDir = Join-Path $ApiPath ".tmp"

  if (-not (Test-Path $ScriptDir)) {
    New-Item -ItemType Directory -Path $ScriptDir -Force | Out-Null
  }

  $NodeScriptPath = Join-Path $ScriptDir "make-super-admin-v60b.js"

  $NodeScript = @'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    throw new Error('Informe o e-mail da conta que deve virar SUPER_ADMIN.');
  }

  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    throw new Error(`Usuario nao encontrado com e-mail: ${email}`);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
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
    node ".tmp\make-super-admin-v60b.js" "$SuperAdminEmail"

    if ($LASTEXITCODE -ne 0) {
      throw "Nao consegui promover a conta para SUPER_ADMIN. Confira se o e-mail existe no banco."
    }

    Write-Host "Conta promovida para SUPER_ADMIN." -ForegroundColor Green
  }
  finally {
    Pop-Location
  }
}

Write-Host "Aplicando v60b - SUPER_ADMIN total corrigido..." -ForegroundColor Cyan

Patch-RolesGuard-Safe
Patch-AdminAccessController
Patch-AdminAccessService
Patch-CustomerHeader
Patch-AdminNewEventGuard
Patch-ModeratorPage
Promote-SuperAdmin

Write-Host ""
Write-Host "v60b aplicada com sucesso." -ForegroundColor Green
Write-Host ""
Write-Host "Resumo:" -ForegroundColor Cyan
Write-Host "- SUPER_ADMIN: acesso total e moderacao." -ForegroundColor Cyan
Write-Host "- ADMIN: produtor aprovado, pode criar eventos." -ForegroundColor Cyan
Write-Host "- CUSTOMER/OPERATOR: abre chamado para virar ADMIN." -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE: saia e entre novamente com a conta SUPER_ADMIN para atualizar token/localStorage." -ForegroundColor Yellow
Write-Host ""
Write-Host "Reinicie API e WEB:" -ForegroundColor Cyan
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\api"' -ForegroundColor Cyan
Write-Host "npm run start:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\web"' -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor Cyan

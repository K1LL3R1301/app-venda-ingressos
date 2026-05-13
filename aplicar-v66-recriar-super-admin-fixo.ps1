# aplicar-v66-recriar-super-admin-fixo.ps1
# Apaga a conta SUPER_ADMIN antiga e cria/atualiza uma nova conta SUPER_ADMIN fixa.
#
# Conta nova:
# CPF: 444.444.444-44
# Senha: 123456
# Email interno: superadmin@astroingressos.local
# Nome: Super Admin Astro
#
# Conta antiga removida:
# marchesinigabriel@hotmail.com
#
# Rode na raiz do projeto plataforma-ingressos.

$ErrorActionPreference = "Stop"

$Root = Get-Location
$ApiPath = Join-Path $Root "apps\api"

if (-not (Test-Path $ApiPath)) {
  throw "Pasta apps\api nao encontrada. Rode este script na raiz do projeto plataforma-ingressos."
}

$ScriptDir = Join-Path $ApiPath ".tmp"

if (-not (Test-Path $ScriptDir)) {
  New-Item -ItemType Directory -Path $ScriptDir -Force | Out-Null
}

$NodeScriptPath = Join-Path $ScriptDir "recriar-super-admin-fixo-v66.js"

$NodeScript = @'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const OLD_EMAIL = 'marchesinigabriel@hotmail.com';
const NEW_EMAIL = 'superadmin@astroingressos.local';
const NEW_NAME = 'Super Admin Astro';
const NEW_CPF = '444.444.444-44';
const NEW_CPF_NORMALIZED = '44444444444';
const NEW_PASSWORD = '123456';

async function safeDeleteOldUser(oldUser, targetUser) {
  if (!oldUser) return { action: 'not_found' };

  if (targetUser && oldUser.id === targetUser.id) {
    return { action: 'same_user_reused' };
  }

  try {
    await prisma.user.delete({
      where: { id: oldUser.id },
    });

    return { action: 'deleted' };
  } catch (error) {
    const archivedEmail = `deleted-${Date.now()}-${oldUser.email}`;
    const archivedCpfNormalized = `deleted${Date.now()}`.slice(0, 14);

    await prisma.user.update({
      where: { id: oldUser.id },
      data: {
        email: archivedEmail,
        cpf: null,
        cpfNormalized: archivedCpfNormalized,
        role: 'CUSTOMER',
        status: 'INACTIVE',
      },
    });

    return {
      action: 'archived',
      reason: error.message || String(error),
      archivedEmail,
    };
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);

  const oldUser = await prisma.user.findFirst({
    where: { email: OLD_EMAIL },
  });

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: NEW_EMAIL },
        { cpfNormalized: NEW_CPF_NORMALIZED },
        { cpf: NEW_CPF },
      ],
    },
  });

  const oldResult = await safeDeleteOldUser(oldUser, targetUser);

  const user = targetUser
    ? await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          name: NEW_NAME,
          email: NEW_EMAIL,
          passwordHash,
          cpf: NEW_CPF,
          cpfNormalized: NEW_CPF_NORMALIZED,
          authProvider: 'PASSWORD',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          emailVerifiedAt: targetUser.emailVerifiedAt || new Date(),
        },
      })
    : await prisma.user.create({
        data: {
          name: NEW_NAME,
          email: NEW_EMAIL,
          passwordHash,
          cpf: NEW_CPF,
          cpfNormalized: NEW_CPF_NORMALIZED,
          authProvider: 'PASSWORD',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });

  console.log('');
  console.log('SUPER_ADMIN RECRIADO COM SUCESSO');
  console.log('================================');
  console.log(`Conta antiga (${OLD_EMAIL}): ${oldResult.action}`);
  if (oldResult.archivedEmail) {
    console.log(`Conta antiga arquivada como: ${oldResult.archivedEmail}`);
    console.log('Obs: o banco bloqueou exclusao fisica por relacoes, entao ela foi desativada e removida do acesso.');
  }
  console.log('');
  console.log('DADOS PARA LOGIN');
  console.log('================');
  console.log(`CPF: ${user.cpf}`);
  console.log(`Senha: ${NEW_PASSWORD}`);
  console.log(`Email interno: ${user.email}`);
  console.log(`Nome: ${user.name}`);
  console.log(`Role: ${user.role}`);
  console.log('');
  console.log('IMPORTANTE: faca logout/login no navegador para atualizar token e localStorage.');
}

main()
  .catch((error) => {
    console.error('');
    console.error('ERRO AO RECRIAR SUPER_ADMIN');
    console.error('===========================');
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
  Write-Host "Recriando SUPER_ADMIN fixo..." -ForegroundColor Cyan

  node ".tmp\recriar-super-admin-fixo-v66.js"

  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao recriar SUPER_ADMIN."
  }
}
finally {
  Pop-Location
}

Write-Host ""
Write-Host "v66 aplicada com sucesso." -ForegroundColor Green
Write-Host ""
Write-Host "Login novo:" -ForegroundColor Cyan
Write-Host "CPF: 444.444.444-44" -ForegroundColor Cyan
Write-Host "Senha: 123456" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agora faca logout/login no site." -ForegroundColor Yellow

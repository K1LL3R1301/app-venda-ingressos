# criar-ou-atualizar-super-admin-v60c.ps1
# Cria uma conta nova como SUPER_ADMIN ou atualiza a conta se o e-mail ja existir.
#
# Login do sistema usa CPF + senha, entao este script imprime:
# - E-mail
# - CPF de login
# - Senha temporaria
# - Role SUPER_ADMIN
#
# Uso recomendado:
# powershell -ExecutionPolicy Bypass -File ".\criar-ou-atualizar-super-admin-v60c.ps1"
#
# Ou com senha manual:
# powershell -ExecutionPolicy Bypass -File ".\criar-ou-atualizar-super-admin-v60c.ps1" -Password "MinhaSenha@123"

param(
  [string]$Email = "marchesinigabriel@hotmail.com",
  [string]$Name = "Super Admin Astro",
  [string]$Password = "",
  [string]$Cpf = ""
)

$ErrorActionPreference = "Stop"

$Root = Get-Location
$ApiPath = Join-Path $Root "apps\api"

if (-not (Test-Path $ApiPath)) {
  throw "Pasta apps\api nao encontrada. Rode este script na raiz do projeto plataforma-ingressos."
}

if ([string]::IsNullOrWhiteSpace($Email)) {
  throw "E-mail obrigatorio."
}

$ScriptDir = Join-Path $ApiPath ".tmp"

if (-not (Test-Path $ScriptDir)) {
  New-Item -ItemType Directory -Path $ScriptDir -Force | Out-Null
}

$NodeScriptPath = Join-Path $ScriptDir "create-super-admin-v60c.js"

$NodeScript = @'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatCpf(value) {
  const digits = onlyDigits(value).padStart(11, '0').slice(-11);

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function randomPassword() {
  const part = Math.random().toString(36).slice(2, 10);
  const part2 = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `Astro@${part2}${part}!`;
}

function randomCpfCandidate() {
  // O login atual apenas normaliza CPF, nao valida digito.
  // Gera 11 digitos iniciando com 8 para reduzir chance de conflito com seeds reais.
  let value = '8';

  for (let i = 0; i < 10; i += 1) {
    value += Math.floor(Math.random() * 10);
  }

  return value;
}

async function getFreeCpf(preferredCpf, existingUser) {
  const existingCpf = onlyDigits(existingUser?.cpfNormalized || existingUser?.cpf);

  if (existingCpf.length === 11) {
    return existingCpf;
  }

  const preferred = onlyDigits(preferredCpf);

  if (preferred.length === 11) {
    const taken = await prisma.user.findFirst({
      where: {
        cpfNormalized: preferred,
        NOT: existingUser ? { id: existingUser.id } : undefined,
      },
    });

    if (!taken) return preferred;
  }

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = randomCpfCandidate();
    const taken = await prisma.user.findFirst({
      where: { cpfNormalized: candidate },
    });

    if (!taken) return candidate;
  }

  throw new Error('Nao consegui gerar CPF livre para login.');
}

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  const name = String(process.argv[3] || 'Super Admin Astro').trim();
  const providedPassword = String(process.argv[4] || '').trim();
  const providedCpf = String(process.argv[5] || '').trim();

  if (!email) {
    throw new Error('E-mail obrigatorio.');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  const password = providedPassword || randomPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const cpfNormalized = await getFreeCpf(providedCpf, existingUser);
  const cpfFormatted = formatCpf(cpfNormalized);

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: existingUser.name || name,
          passwordHash,
          cpf: existingUser.cpf || cpfFormatted,
          cpfNormalized,
          authProvider: 'PASSWORD',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          emailVerifiedAt: existingUser.emailVerifiedAt || new Date(),
        },
      })
    : await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          cpf: cpfFormatted,
          cpfNormalized,
          authProvider: 'PASSWORD',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });

  console.log('');
  console.log('SUPER ADMIN PRONTO');
  console.log('==================');
  console.log(`ID: ${user.id}`);
  console.log(`Nome: ${user.name}`);
  console.log(`E-mail: ${user.email}`);
  console.log(`Role: ${user.role}`);
  console.log('');
  console.log('DADOS PARA LOGIN');
  console.log('================');
  console.log(`CPF: ${user.cpf}`);
  console.log(`Senha temporaria: ${password}`);
  console.log('');
  console.log('IMPORTANTE: faca logout/login no site para atualizar token e localStorage.');
}

main()
  .catch((error) => {
    console.error('');
    console.error('ERRO AO CRIAR SUPER_ADMIN');
    console.error('=========================');
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
  Write-Host "Criando/atualizando SUPER_ADMIN..." -ForegroundColor Cyan

  node ".tmp\create-super-admin-v60c.js" "$Email" "$Name" "$Password" "$Cpf"

  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao criar/atualizar SUPER_ADMIN."
  }
}
finally {
  Pop-Location
}

Write-Host ""
Write-Host "Conta SUPER_ADMIN criada/atualizada com sucesso." -ForegroundColor Green
Write-Host ""
Write-Host "Agora reinicie API e WEB se estiverem abertos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "API:" -ForegroundColor Yellow
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\api"' -ForegroundColor Cyan
Write-Host "npm run start:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "WEB:" -ForegroundColor Yellow
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\web"' -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor Cyan

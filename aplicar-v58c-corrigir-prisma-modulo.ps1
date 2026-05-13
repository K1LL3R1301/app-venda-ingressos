# aplicar-v58c-corrigir-prisma-modulo.ps1
# Correção da v58b:
# O script anterior já criou os arquivos da API/WEB, mas falhou ao adicionar o model no Prisma.
# Este script continua de onde parou:
# 1. adiciona o model AdminAccessRequest no schema.prisma se ainda nao existir
# 2. adiciona AdminAccessRequestsModule no app.module.ts se ainda nao existir
# 3. roda npx prisma db push
# 4. roda npx prisma generate

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host "Aplicando v58c - correcao do Prisma e modulo..." -ForegroundColor Cyan

$SchemaPath = Join-Path $Root "apps\api\prisma\schema.prisma"

if (-not (Test-Path $SchemaPath)) {
  throw "schema.prisma nao encontrado em apps\api\prisma\schema.prisma. Rode este script na raiz do projeto."
}

$Schema = Get-Content $SchemaPath -Raw

if ($Schema -match "model\s+AdminAccessRequest\s+\{") {
  Write-Host "Modelo AdminAccessRequest ja existe no schema.prisma." -ForegroundColor Yellow
} else {
  $Backup = "$SchemaPath.bak-v58c-$Stamp"
  Copy-Item $SchemaPath $Backup -Force
  Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray

  $ModelContent = @'

model AdminAccessRequest {
  id       String @id @default(uuid())
  protocol String @unique

  requesterUserId String
  requesterRole   String?
  requesterName   String?
  requesterEmail  String?
  requesterCpf    String?

  fullName         String
  email            String
  cpfCnpj          String
  phone            String
  producerName     String
  producerDocument String
  city             String
  state            String
  websiteOrSocial  String
  eventTypes       String

  firstEventDescription String
  estimatedEventDate    DateTime
  expectedAudience      String
  experience            String
  reason                String
  extraNotes            String?

  acceptedReviewTerm Boolean @default(false)
  acceptedTruthTerm  Boolean @default(false)

  status                     String   @default("PENDING_REVIEW")
  reviewDeadlineBusinessDays Int      @default(15)
  submittedAt                DateTime @default(now())

  moderatorUserId String?
  moderatorName   String?
  moderatorEmail  String?
  moderatorNote   String?
  reviewedAt      DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([requesterUserId])
  @@index([requesterEmail])
  @@index([status])
  @@index([submittedAt])
  @@index([reviewedAt])
}
'@

  Add-Content -Path $SchemaPath -Value $ModelContent -Encoding UTF8
  Write-Host "Modelo AdminAccessRequest adicionado ao schema.prisma." -ForegroundColor Green
}

$AppModulePath = Join-Path $Root "apps\api\src\app.module.ts"

if (-not (Test-Path $AppModulePath)) {
  throw "app.module.ts nao encontrado em apps\api\src\app.module.ts"
}

$AppModule = Get-Content $AppModulePath -Raw

if ($AppModule -match "AdminAccessRequestsModule") {
  Write-Host "AdminAccessRequestsModule ja existe no app.module.ts." -ForegroundColor Yellow
} else {
  $Backup = "$AppModulePath.bak-v58c-$Stamp"
  Copy-Item $AppModulePath $Backup -Force
  Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray

  $ImportLine = "import { AdminAccessRequestsModule } from './admin-access-requests/admin-access-requests.module';"

  # Coloca o import depois do ultimo import existente.
  $LastImportMatch = [regex]::Matches($AppModule, "import\s+.*?;\s*") | Select-Object -Last 1

  if ($null -eq $LastImportMatch) {
    $AppModule = $ImportLine + "`r`n" + $AppModule
  } else {
    $InsertAt = $LastImportMatch.Index + $LastImportMatch.Length
    $AppModule = $AppModule.Insert($InsertAt, "`r`n$ImportLine")
  }

  # Coloca o modulo dentro do array imports do @Module.
  if ($AppModule -match "imports\s*:\s*\[") {
    $AppModule = [regex]::Replace(
      $AppModule,
      "imports\s*:\s*\[",
      "imports: [`r`n    AdminAccessRequestsModule,",
      1
    )
  } else {
    throw "Nao encontrei o array imports: [ no app.module.ts. Adicione AdminAccessRequestsModule manualmente."
  }

  Set-Content -Path $AppModulePath -Value $AppModule -Encoding UTF8
  Write-Host "AdminAccessRequestsModule adicionado ao app.module.ts." -ForegroundColor Green
}

$ApiPath = Join-Path $Root "apps\api"

if (-not (Test-Path $ApiPath)) {
  throw "Pasta apps\api nao encontrada."
}

Push-Location $ApiPath

try {
  Write-Host ""
  Write-Host "Rodando: npx prisma db push" -ForegroundColor Cyan
  npx prisma db push

  if ($LASTEXITCODE -ne 0) {
    throw "npx prisma db push falhou. Veja o erro acima."
  }

  Write-Host ""
  Write-Host "Rodando: npx prisma generate" -ForegroundColor Cyan
  npx prisma generate

  if ($LASTEXITCODE -ne 0) {
    throw "npx prisma generate falhou. Veja o erro acima."
  }
}
finally {
  Pop-Location
}

Write-Host ""
Write-Host "v58c aplicada com sucesso." -ForegroundColor Green
Write-Host "Agora reinicie API e WEB:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Terminal API:" -ForegroundColor Yellow
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\api"' -ForegroundColor Cyan
Write-Host "npm run start:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Terminal WEB:" -ForegroundColor Yellow
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\web"' -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Rotas para testar:" -ForegroundColor Cyan
Write-Host "- /support/admin-request" -ForegroundColor Cyan
Write-Host "- /admin/support/admin-requests" -ForegroundColor Cyan

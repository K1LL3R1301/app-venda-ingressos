$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiRoot = Join-Path $ProjectRoot "apps\api"
$SchemaPath = Join-Path $ApiRoot "prisma\schema.prisma"

$Stamp = Get-Date -Format "yyyyMMddHHmmss"
$MigrationDir = Join-Path $ApiRoot "prisma\migrations\${Stamp}_restore_place_reservation"
$MigrationPath = Join-Path $MigrationDir "migration.sql"

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

function Backup-File {
  param([Parameter(Mandatory = $true)][string] $Path)

  if (!(Test-Path -LiteralPath $Path)) {
    throw "Arquivo nao encontrado: $Path"
  }

  $BackupPath = "$Path.bak-restore-place-reservation-$Stamp"
  Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
  Write-Host "[OK] Backup criado: $BackupPath"
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Restaurando tabela PlaceReservation e protegendo no Prisma schema"

if (!(Test-Path -LiteralPath $SchemaPath)) {
  throw "schema.prisma nao encontrado em: $SchemaPath"
}

Backup-File $SchemaPath

$Schema = [System.IO.File]::ReadAllText($SchemaPath)

$PlaceReservationModel = @'

model PlaceReservation {
  id              String    @id @default(uuid())
  eventId         String
  eventSessionId  String?
  venueSectorId   String?
  seatMapObjectId String?
  ticketTypeId    String?
  orderId         String?
  userId          String?
  placeKey        String
  physicalKey     String
  kind            String
  label           String?
  quantity        Int       @default(1)
  chairCount      Int?
  subTickets      Json?
  amount          Decimal?  @db.Decimal(10, 2)
  status          String    @default("HELD")
  expiresAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([eventId], name: "PlaceReservation_event_idx")
  @@index([eventSessionId, venueSectorId], name: "PlaceReservation_session_sector_idx")
  @@index([eventId, eventSessionId, venueSectorId, physicalKey], name: "PlaceReservation_physical_idx")
  @@index([orderId], name: "PlaceReservation_order_idx")
  @@index([status, expiresAt], name: "PlaceReservation_status_expires_idx")
}
'@

if ($Schema -notmatch '(?m)^\s*model\s+PlaceReservation\s*\{') {
  $Schema = $Schema.TrimEnd() + "`r`n" + $PlaceReservationModel + "`r`n"
  Write-Utf8NoBom -Path $SchemaPath -Content $Schema
  Write-Host "[OK] model PlaceReservation adicionado ao schema.prisma."
} else {
  Write-Host "[OK] model PlaceReservation ja existe no schema.prisma."
}

$MigrationSql = @'
CREATE TABLE IF NOT EXISTS "PlaceReservation" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "eventSessionId" TEXT,
  "venueSectorId" TEXT,
  "seatMapObjectId" TEXT,
  "ticketTypeId" TEXT,
  "orderId" TEXT,
  "userId" TEXT,
  "placeKey" TEXT NOT NULL,
  "physicalKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "chairCount" INTEGER,
  "subTickets" JSONB,
  "amount" NUMERIC(10, 2),
  "status" TEXT NOT NULL DEFAULT 'HELD',
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PlaceReservation_event_idx"
  ON "PlaceReservation" ("eventId");

CREATE INDEX IF NOT EXISTS "PlaceReservation_session_sector_idx"
  ON "PlaceReservation" ("eventSessionId", "venueSectorId");

CREATE INDEX IF NOT EXISTS "PlaceReservation_physical_idx"
  ON "PlaceReservation" ("eventId", "eventSessionId", "venueSectorId", "physicalKey");

CREATE INDEX IF NOT EXISTS "PlaceReservation_order_idx"
  ON "PlaceReservation" ("orderId");

CREATE INDEX IF NOT EXISTS "PlaceReservation_status_expires_idx"
  ON "PlaceReservation" ("status", "expiresAt");
'@

New-Item -ItemType Directory -Force -Path $MigrationDir | Out-Null
Write-Utf8NoBom -Path $MigrationPath -Content $MigrationSql
Write-Host "[OK] Migration criada: $MigrationPath"

Set-Location $ApiRoot

Write-Host "[INFO] Formatando Prisma..."
npx prisma format
if ($LASTEXITCODE -ne 0) {
  throw "prisma format falhou."
}

Write-Host "[INFO] Validando Prisma..."
npx prisma validate
if ($LASTEXITCODE -ne 0) {
  throw "prisma validate falhou."
}

Write-Host "[INFO] Executando SQL para recriar PlaceReservation no banco..."
npx prisma db execute --file $MigrationPath --schema .\prisma\schema.prisma
if ($LASTEXITCODE -ne 0) {
  throw "prisma db execute falhou. Confira se o Postgres esta ligado e se DATABASE_URL esta correto."
}

Write-Host "[INFO] Gerando Prisma Client..."
npx prisma generate
if ($LASTEXITCODE -ne 0) {
  throw "prisma generate falhou."
}

Write-Host ""
Write-Host "[OK] PlaceReservation restaurada."
Write-Host ""
Write-Host "Agora teste o pedido de novo com a API ligada:"
Write-Host "http://localhost:3000/orders/8d73d120-df7e-4f0d-91de-7586e8dd2190"
Write-Host ""
Write-Host "Depois rode o build da API:"
Write-Host "cd `"$ApiRoot`""
Write-Host "npm run build *> log-api-restore-place-reservation-build.txt"
Write-Host "Select-String -Path .\log-api-restore-place-reservation-build.txt -Pattern `"error|Error:|Failed|Cannot find|Type error|Module not found|PlaceReservation|Prisma`" -Context 2,3"

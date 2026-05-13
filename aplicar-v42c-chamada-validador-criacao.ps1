# aplicar-v42c-chamada-validador-criacao.ps1
# Corrige a parte que faltou na v42b:
# adicionar a chamada this.ensureTicketCapacityForCreate(...) depois de sectorsPayload.
# Rode na raiz do projeto: plataforma-ingressos

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$EventsServicePath = Join-Path $Root "apps\api\src\events\events.service.ts"

function Backup-File($Path) {
  if (-not (Test-Path $Path)) {
    throw "Arquivo nao encontrado: $Path"
  }

  $Backup = "$Path.bak-v42c-$Stamp"
  Copy-Item $Path $Backup -Force
  Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray
}

function Ensure-Validator-Helper($Text) {
  if ($Text -match "ensureTicketCapacityForCreate") {
    Write-Host "Validador ensureTicketCapacityForCreate ja existe na API." -ForegroundColor Yellow
    return $Text
  }

  $Guard = @'
  private toCapacityInt(value?: string | number | null) {
    const parsed =
      typeof value === 'number'
        ? value
        : Number(String(value ?? '').replace(',', '.'));

    if (!Number.isFinite(parsed) || parsed < 1) return 0;

    return Math.floor(parsed);
  }

  private ensureTicketCapacityForCreate(
    data: CreateEventDto,
    sessionsPayload: LocalSessionPayload[],
    sectorsPayload: LocalSectorPayload[],
  ) {
    const eventCapacity = this.toCapacityInt(data.capacity);

    if (eventCapacity <= 0) {
      throw new BadRequestException('A capacidade geral do evento precisa ser maior que zero.');
    }

    const sessionKeys = sessionsPayload.map(
      (session, index) => session.localId || `session-${index}`,
    );
    const sectorKeys = sectorsPayload.map(
      (sector, index) => sector.localId || `sector-${index}`,
    );
    const sessionCapacityByLocalId = new Map<string, number>();
    const sectorCapacityByLocalId = new Map<string, number>();

    for (const [index, session] of sessionsPayload.entries()) {
      const key = session.localId || `session-${index}`;
      const sessionCapacity = this.toCapacityInt(session.capacity) || eventCapacity;

      if (sessionCapacity > eventCapacity) {
        throw new BadRequestException(
          `A capacidade da data ${session.name} não pode ultrapassar a capacidade geral.`,
        );
      }

      sessionCapacityByLocalId.set(key, sessionCapacity);
    }

    const sessionTotal = [...sessionCapacityByLocalId.values()].reduce(
      (sum, value) => sum + value,
      0,
    );

    if (sessionTotal > eventCapacity) {
      throw new BadRequestException(
        'A soma das capacidades das datas não pode ultrapassar a capacidade geral.',
      );
    }

    for (const [index, sector] of sectorsPayload.entries()) {
      const key = sector.localId || `sector-${index}`;
      const sectorCapacity = this.toCapacityInt(sector.capacity) || eventCapacity;

      if (sectorCapacity > eventCapacity) {
        throw new BadRequestException(
          `A capacidade do setor ${sector.name} não pode ultrapassar a capacidade geral.`,
        );
      }

      sectorCapacityByLocalId.set(key, sectorCapacity);
    }

    const sectorTotal = [...sectorCapacityByLocalId.values()].reduce(
      (sum, value) => sum + value,
      0,
    );

    for (const session of sessionsPayload) {
      const sessionKey = session.localId || sessionKeys[0] || 'default-session';
      const sessionCapacity = sessionCapacityByLocalId.get(sessionKey) || eventCapacity;

      if (sectorTotal > sessionCapacity) {
        throw new BadRequestException(
          `A soma dos setores (${sectorTotal}) não pode ultrapassar a capacidade da data ${session.name} (${sessionCapacity}).`,
        );
      }
    }

    const usedBySession = new Map<string, number>();
    const usedBySessionAndSector = new Map<string, number>();
    const tickets = data.ticketTypes || [];
    const fallbackSectorKey = sectorKeys[0] || 'default-sector';

    for (const ticket of tickets) {
      const quantity = this.toCapacityInt(ticket.quantity);

      if (quantity <= 0) continue;

      const sectorKey = ticket.venueSectorLocalId || fallbackSectorKey;
      const sectorCapacity =
        sectorCapacityByLocalId.get(sectorKey) ||
        sectorCapacityByLocalId.get(fallbackSectorKey) ||
        eventCapacity;
      const targetSessionKeys = ticket.eventSessionLocalId
        ? [ticket.eventSessionLocalId]
        : sessionKeys.length
          ? sessionKeys
          : ['default-session'];

      for (const sessionKey of targetSessionKeys) {
        const sessionCapacity =
          sessionCapacityByLocalId.get(sessionKey) || eventCapacity;
        const groupLimit = Math.min(sessionCapacity, sectorCapacity);
        const groupKey = `${sessionKey}::${sectorKey}`;
        const nextGroupTotal =
          (usedBySessionAndSector.get(groupKey) || 0) + quantity;
        const nextSessionTotal = (usedBySession.get(sessionKey) || 0) + quantity;

        if (nextGroupTotal > groupLimit) {
          throw new BadRequestException(
            'Ingressos ultrapassam a capacidade disponível do setor nesta data. Refaça os lotes automaticamente.',
          );
        }

        if (nextSessionTotal > sessionCapacity) {
          throw new BadRequestException(
            'Ingressos ultrapassam a capacidade disponível desta data. Refaça os lotes automaticamente.',
          );
        }

        usedBySessionAndSector.set(groupKey, nextGroupTotal);
        usedBySession.set(sessionKey, nextSessionTotal);
      }
    }
  }

'@

  $Marker = "  private buildContentPayload(data?: CreateEventDto['content']) {"

  if (-not $Text.Contains($Marker)) {
    throw "Nao encontrei o ponto para inserir ensureTicketCapacityForCreate no events.service.ts."
  }

  Write-Host "Validador ensureTicketCapacityForCreate adicionado na API." -ForegroundColor Green
  return $Text.Replace($Marker, $Guard + $Marker)
}

function Add-Validator-Call($Text) {
  $Call = "    this.ensureTicketCapacityForCreate(data, sessionsPayload, sectorsPayload);"

  if ($Text.Contains($Call.Trim())) {
    Write-Host "Chamada do validador ja existe no metodo create()." -ForegroundColor Yellow
    return $Text
  }

  $Lines = $Text -split "`r?`n"
  $StartIndex = -1

  for ($i = 0; $i -lt $Lines.Count; $i++) {
    if ($Lines[$i] -match "const\s+sectorsPayload\s*=\s*this\.buildSectorsPayload\s*\(") {
      $StartIndex = $i
      break
    }
  }

  if ($StartIndex -lt 0) {
    throw "Nao encontrei a linha const sectorsPayload = this.buildSectorsPayload(...)."
  }

  $EndIndex = -1

  for ($i = $StartIndex + 1; $i -lt $Lines.Count; $i++) {
    if ($Lines[$i].Trim() -eq ");") {
      $EndIndex = $i
      break
    }
  }

  if ($EndIndex -lt 0) {
    throw "Encontrei sectorsPayload, mas nao encontrei o fechamento ');'."
  }

  $Before = @()
  $After = @()

  if ($EndIndex -ge 0) {
    $Before = $Lines[0..$EndIndex]
  }

  if ($EndIndex + 1 -le $Lines.Count - 1) {
    $After = $Lines[($EndIndex + 1)..($Lines.Count - 1)]
  }

  $NextLines = @()
  $NextLines += $Before
  $NextLines += ""
  $NextLines += $Call
  $NextLines += $After

  Write-Host "Chamada do validador adicionada logo depois de sectorsPayload." -ForegroundColor Green
  return ($NextLines -join "`r`n")
}

Write-Host "Aplicando v42c - finalizando chamada do validador na API..." -ForegroundColor Cyan

Backup-File $EventsServicePath

$Text = Get-Content $EventsServicePath -Raw -Encoding UTF8
$Text = Ensure-Validator-Helper $Text
$Text = Add-Validator-Call $Text

Set-Content -Path $EventsServicePath -Value $Text -Encoding UTF8

Write-Host "v42c aplicada com sucesso." -ForegroundColor Green
Write-Host "Agora reinicie a API:" -ForegroundColor Cyan
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\api"' -ForegroundColor Cyan
Write-Host "npm run start:dev" -ForegroundColor Cyan

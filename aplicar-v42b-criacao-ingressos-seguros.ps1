# aplicar-v42b-criacao-ingressos-seguros.ps1
# Corrige a v42 quando o arquivo new/page.tsx nao tem exatamente "ticketTypes: tickets.map".
# Rode na raiz do projeto: plataforma-ingressos

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$NewPagePath = Join-Path $Root "apps\web\src\app\admin\events\new\page.tsx"
$EventsServicePath = Join-Path $Root "apps\api\src\events\events.service.ts"

function Backup-File($Path) {
  if (-not (Test-Path $Path)) {
    throw "Arquivo nao encontrado: $Path"
  }

  $Backup = "$Path.bak-v42b-$Stamp"
  Copy-Item $Path $Backup -Force
  Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray
}

function Patch-NewPage {
  Backup-File $NewPagePath

  $Text = Get-Content $NewPagePath -Raw -Encoding UTF8

  if ($Text -notmatch "function clampTicketsForCapacity") {
    $Helper = @'
function clampTicketsForCapacity(
  sourceTickets: TicketItem[],
  sessions: SessionItem[],
  sectors: SectorItem[],
  eventCapacityValue: string,
  isOpenOnly: boolean,
) {
  const eventCapacity = Math.max(0, toNumber(eventCapacityValue));
  const fallbackSession = sessions[0]?.localId || "default-session";
  const fallbackSector = isOpenOnly ? "" : sectors[0]?.localId || "default-sector";
  const sessionCapacityById = new Map(
    sessions.map((session) => [
      session.localId,
      positiveIntOrZero(session.capacity) || eventCapacity,
    ]),
  );
  const sectorCapacityById = new Map(
    sectors.map((sector) => [
      isOpenOnly ? "" : sector.localId,
      positiveIntOrZero(sector.capacity) || eventCapacity,
    ]),
  );
  const groupUsed = new Map<string, number>();
  const sessionUsed = new Map<string, number>();
  const sanitized: TicketItem[] = [];

  const ordered = [...sourceTickets]
    .filter((ticket) => ticket.name.trim() && ticket.price.trim() && toNumber(ticket.quantity) > 0)
    .sort((a, b) => {
      const sessionCompare = String(a.eventSessionLocalId || "").localeCompare(String(b.eventSessionLocalId || ""));
      if (sessionCompare !== 0) return sessionCompare;
      const sectorCompare = String(a.venueSectorLocalId || "").localeCompare(String(b.venueSectorLocalId || ""));
      if (sectorCompare !== 0) return sectorCompare;
      const lotCompare = lotNumber(a.lotLabel) - lotNumber(b.lotLabel);
      if (lotCompare !== 0) return lotCompare;
      return TICKET_KIND_OPTIONS.findIndex((item) => item.value === a.ticketKind) - TICKET_KIND_OPTIONS.findIndex((item) => item.value === b.ticketKind);
    });

  for (const ticket of ordered) {
    const sectorKey = isOpenOnly ? "" : ticket.venueSectorLocalId || fallbackSector;
    const sectorLimit = sectorCapacityById.get(sectorKey) || eventCapacity;
    const sessionKeys = ticket.eventSessionLocalId
      ? [ticket.eventSessionLocalId]
      : sessions.map((session) => session.localId).filter(Boolean);
    const effectiveSessionKeys = sessionKeys.length ? sessionKeys : [fallbackSession];

    const possibleQuantity = effectiveSessionKeys.reduce((min, sessionKey) => {
      const sessionLimit = sessionCapacityById.get(sessionKey) || eventCapacity;
      const groupLimit = Math.max(0, Math.min(sessionLimit, sectorLimit));
      const groupKey = `${sessionKey}::${sectorKey}`;
      const groupRemaining = groupLimit - (groupUsed.get(groupKey) || 0);
      const sessionRemaining = sessionLimit - (sessionUsed.get(sessionKey) || 0);
      return Math.min(min, groupRemaining, sessionRemaining);
    }, toNumber(ticket.quantity));

    const nextQuantity = Math.max(0, Math.min(toNumber(ticket.quantity), possibleQuantity));

    if (nextQuantity <= 0) continue;

    for (const sessionKey of effectiveSessionKeys) {
      const groupKey = `${sessionKey}::${sectorKey}`;
      groupUsed.set(groupKey, (groupUsed.get(groupKey) || 0) + nextQuantity);
      sessionUsed.set(sessionKey, (sessionUsed.get(sessionKey) || 0) + nextQuantity);
    }

    sanitized.push({
      ...ticket,
      quantity: String(Math.floor(nextQuantity)),
      eventSessionLocalId: ticket.eventSessionLocalId || effectiveSessionKeys[0] || fallbackSession,
      venueSectorLocalId: sectorKey,
    });
  }

  return sanitized;
}

'@

    $Marker = "export default function NewEventPage() {"
    if (-not $Text.Contains($Marker)) {
      throw "Nao encontrei o marcador do componente NewEventPage. Patch do front interrompido."
    }

    $Text = $Text.Replace($Marker, $Helper + $Marker)
    Write-Host "Helper clampTicketsForCapacity adicionado ao front de criacao." -ForegroundColor Green
  }
  else {
    Write-Host "Front de criacao ja possui clampTicketsForCapacity. Pulando insercao." -ForegroundColor Yellow
  }

  $ClampCall = "clampTicketsForCapacity(tickets, sessions, sectors, capacity, isOpenOnly)"

  if ($Text.Contains($ClampCall)) {
    Write-Host "Payload de criacao ja usa clampTicketsForCapacity." -ForegroundColor Yellow
  }
  else {
    # Patch flexivel:
    # funciona para:
    # ticketTypes: tickets.map(...)
    # ticketTypes: tickets
    #   .filter(...)
    #   .map(...)
    # e outros casos onde a expressao comeca com "tickets".
    $Pattern = "ticketTypes:\s*tickets\b"
    $Replacement = "ticketTypes: $ClampCall"

    $NewText = [regex]::Replace($Text, $Pattern, $Replacement, 1)

    if ($NewText -eq $Text) {
      Write-Host "Nao encontrei 'ticketTypes: tickets' de forma direta." -ForegroundColor Yellow
      Write-Host "Trechos encontrados com 'ticketTypes:' para diagnostico:" -ForegroundColor Yellow

      $Matches = [regex]::Matches($Text, "ticketTypes:[\s\S]{0,240}")
      foreach ($Match in $Matches) {
        Write-Host "----------------------------------------" -ForegroundColor DarkYellow
        Write-Host $Match.Value -ForegroundColor Yellow
      }

      throw "Patch do front incompleto. Me envie os trechos acima."
    }

    $Text = $NewText
    Write-Host "Payload de criacao agora usa tickets saneados por capacidade." -ForegroundColor Green
  }

  Set-Content -Path $NewPagePath -Value $Text -Encoding UTF8
}

function Patch-EventsService {
  Backup-File $EventsServicePath

  $Text = Get-Content $EventsServicePath -Raw -Encoding UTF8

  if ($Text -notmatch "ensureTicketCapacityForCreate") {
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

    $Text = $Text.Replace($Marker, $Guard + $Marker)
    Write-Host "Validador de capacidade da criacao adicionado na API." -ForegroundColor Green
  }
  else {
    Write-Host "API ja possui ensureTicketCapacityForCreate. Pulando insercao." -ForegroundColor Yellow
  }

  $ValidatorCall = "this.ensureTicketCapacityForCreate(data, sessionsPayload, sectorsPayload);"

  if ($Text.Contains($ValidatorCall)) {
    Write-Host "Chamada do validador ja existe." -ForegroundColor Yellow
  }
  else {
    $OriginalCall = @'
    const sectorsPayload = this.buildSectorsPayload(
      data,
      occupancyMode,
      category,
    );

    const shouldAllowSeatMap =
'@

    $ReplacementCall = @'
    const sectorsPayload = this.buildSectorsPayload(
      data,
      occupancyMode,
      category,
    );

    this.ensureTicketCapacityForCreate(data, sessionsPayload, sectorsPayload);

    const shouldAllowSeatMap =
'@

    if ($Text.Contains($OriginalCall)) {
      $Text = $Text.Replace($OriginalCall, $ReplacementCall)
      Write-Host "Chamada do validador adicionada antes da criacao do evento." -ForegroundColor Green
    }
    else {
      throw "Nao encontrei o trecho dos sectorsPayload para chamar o validador. Patch da API incompleto."
    }
  }

  Set-Content -Path $EventsServicePath -Value $Text -Encoding UTF8
}

Write-Host "Aplicando v42b - criacao segura de ingressos..." -ForegroundColor Cyan
Patch-NewPage
Patch-EventsService
Write-Host "v42b aplicada. Reinicie a API e o WEB." -ForegroundColor Green
Write-Host "API: cd apps/api ; npm run start:dev" -ForegroundColor Cyan
Write-Host "WEB: cd apps/web ; npm run dev" -ForegroundColor Cyan

# aplicar-v43b-edicao-sem-duplicar-e-validar.ps1
# Continua/corrige a v43 caso ela tenha parado em:
# "Nao encontrei ponto para chamar ensureFullUpdateCapacity(body)."
#
# Rode na raiz do projeto: plataforma-ingressos

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ControllerPath = Join-Path $Root "apps\api\src\events\event-full-update.controller.ts"

if (-not (Test-Path $ControllerPath)) {
  throw "Arquivo nao encontrado: $ControllerPath"
}

$Backup = "$ControllerPath.bak-v43b-$Stamp"
Copy-Item $ControllerPath $Backup -Force
Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray

$Text = Get-Content $ControllerPath -Raw -Encoding UTF8

# -------------------------------------------------------------------
# 1) Garante import BadRequestException.
# -------------------------------------------------------------------
if ($Text -notmatch "BadRequestException") {
  $Text = $Text.Replace(
    "import { Body, Controller, NotFoundException, Param, Patch } from '@nestjs/common';",
    "import { Body, Controller, BadRequestException, NotFoundException, Param, Patch } from '@nestjs/common';"
  )
}
elseif ($Text -match "import\s*\{[^}]*NotFoundException[^}]*\}\s*from '@nestjs/common';" -and $Text -notmatch "import\s*\{[^}]*BadRequestException") {
  $Text = [regex]::Replace(
    $Text,
    "import\s*\{([^}]*)\}\s*from '@nestjs/common';",
    {
      param($m)
      $inside = $m.Groups[1].Value
      if ($inside -match "BadRequestException") {
        return $m.Value
      }
      return "import {" + $inside.TrimEnd() + ", BadRequestException } from '@nestjs/common';"
    },
    1
  )
}

# -------------------------------------------------------------------
# 2) Garante helper ensureFullUpdateCapacity.
# -------------------------------------------------------------------
if ($Text -notmatch "function ensureFullUpdateCapacity") {
  $Helper = @'
function capacityInt(value?: string | number | null) {
  const numeric = intValue(value);
  return numeric || 0;
}

function ensureFullUpdateCapacity(body: CreateEventDto) {
  const eventCapacity = capacityInt(body.capacity);

  if (eventCapacity <= 0) {
    throw new BadRequestException('A capacidade geral do evento precisa ser maior que zero.');
  }

  const sessions = body.sessions || [];
  const sectors = body.sectors || [];
  const tickets = body.ticketTypes || [];

  const sessionKeys = sessions.map((session, index) => session.localId || `session-${index}`);
  const sectorKeys = sectors.map((sector, index) => sector.localId || `sector-${index}`);
  const sessionCapacityByKey = new Map<string, number>();
  const sectorCapacityByKey = new Map<string, number>();

  for (const [index, session] of sessions.entries()) {
    const key = session.localId || `session-${index}`;
    const capacity = capacityInt(session.capacity) || eventCapacity;

    if (capacity > eventCapacity) {
      throw new BadRequestException(
        `A capacidade da data ${session.name || index + 1} não pode ultrapassar a capacidade geral.`,
      );
    }

    sessionCapacityByKey.set(key, capacity);
  }

  const sessionTotal = [...sessionCapacityByKey.values()].reduce((sum, value) => sum + value, 0);

  if (sessionTotal > eventCapacity) {
    throw new BadRequestException(
      'A soma das capacidades das datas não pode ultrapassar a capacidade geral.',
    );
  }

  for (const [index, sector] of sectors.entries()) {
    const key = sector.localId || `sector-${index}`;
    const capacity = capacityInt(sector.capacity) || eventCapacity;

    if (capacity > eventCapacity) {
      throw new BadRequestException(
        `A capacidade do setor ${sector.name || index + 1} não pode ultrapassar a capacidade geral.`,
      );
    }

    sectorCapacityByKey.set(key, capacity);
  }

  const sectorTotal = [...sectorCapacityByKey.values()].reduce((sum, value) => sum + value, 0);

  for (const [index, session] of sessions.entries()) {
    const sessionKey = session.localId || `session-${index}`;
    const sessionCapacity = sessionCapacityByKey.get(sessionKey) || eventCapacity;

    if (sectorTotal > sessionCapacity) {
      throw new BadRequestException(
        `A soma dos setores (${sectorTotal}) não pode ultrapassar a capacidade da data ${session.name || index + 1} (${sessionCapacity}).`,
      );
    }
  }

  const usedBySession = new Map<string, number>();
  const usedBySessionAndSector = new Map<string, number>();
  const fallbackSessionKey = sessionKeys[0] || 'default-session';
  const fallbackSectorKey = sectorKeys[0] || 'default-sector';

  for (const ticket of tickets) {
    const quantity = capacityInt(ticket.quantity);

    if (quantity <= 0) continue;

    const sectorKey = ticket.venueSectorLocalId || fallbackSectorKey;
    const sectorCapacity =
      sectorCapacityByKey.get(sectorKey) ||
      sectorCapacityByKey.get(fallbackSectorKey) ||
      eventCapacity;
    const targetSessionKeys = ticket.eventSessionLocalId
      ? [ticket.eventSessionLocalId]
      : sessionKeys.length
        ? sessionKeys
        : [fallbackSessionKey];

    for (const sessionKey of targetSessionKeys) {
      const sessionCapacity =
        sessionCapacityByKey.get(sessionKey) ||
        sessionCapacityByKey.get(fallbackSessionKey) ||
        eventCapacity;
      const groupLimit = Math.min(sessionCapacity, sectorCapacity);
      const groupKey = `${sessionKey}::${sectorKey}`;
      const nextGroupTotal = (usedBySessionAndSector.get(groupKey) || 0) + quantity;
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

  $Marker = "function dateValue(value?: string | null) {"
  if (-not $Text.Contains($Marker)) {
    throw "Nao encontrei function dateValue para inserir helper de validacao."
  }

  $Text = $Text.Replace($Marker, $Helper + $Marker)
  Write-Host "Helper ensureFullUpdateCapacity adicionado." -ForegroundColor Green
}
else {
  Write-Host "Helper ensureFullUpdateCapacity ja existe." -ForegroundColor Yellow
}

# -------------------------------------------------------------------
# 3) Chama ensureFullUpdateCapacity(body) com busca flexivel.
# -------------------------------------------------------------------
if ($Text -notmatch "ensureFullUpdateCapacity\(body\);") {
  $Lines = $Text -split "`r?`n"
  $InsertIndex = -1

  for ($i = 0; $i -lt $Lines.Count; $i++) {
    if ($Lines[$i] -match "const\s+eventOccupancyMode\s*=") {
      $InsertIndex = $i
      break
    }
  }

  if ($InsertIndex -lt 0) {
    for ($i = 0; $i -lt $Lines.Count; $i++) {
      if ($Lines[$i] -match "const\s+hasOrders\s*=") {
        $InsertIndex = $i
        break
      }
    }
  }

  if ($InsertIndex -lt 0) {
    for ($i = 0; $i -lt $Lines.Count; $i++) {
      if ($Lines[$i] -match "return\s+this\.prisma\.\$transaction") {
        $InsertIndex = $i
        break
      }
    }
  }

  if ($InsertIndex -lt 0) {
    throw "Nao encontrei local flexivel para inserir ensureFullUpdateCapacity(body)."
  }

  $Before = @()
  $After = @()

  if ($InsertIndex -gt 0) {
    $Before = $Lines[0..($InsertIndex - 1)]
  }

  $After = $Lines[$InsertIndex..($Lines.Count - 1)]

  $NewLines = @()
  $NewLines += $Before
  $NewLines += "    ensureFullUpdateCapacity(body);"
  $NewLines += ""
  $NewLines += $After

  $Text = $NewLines -join "`r`n"
  Write-Host "Chamada ensureFullUpdateCapacity(body) adicionada." -ForegroundColor Green
}
else {
  Write-Host "Chamada ensureFullUpdateCapacity(body) ja existe." -ForegroundColor Yellow
}

# -------------------------------------------------------------------
# 4) Troca bloco antigo de sessions/sectors por atualizacao segura.
# -------------------------------------------------------------------
if ($Text -match "existingSessionsByOrder") {
  Write-Host "Bloco seguro de datas/setores ja existe. Pulando substituicao." -ForegroundColor Yellow
}
else {
  $Start = $Text.IndexOf("      const sessionIdByLocalId = new Map<string, string>();")
  $End = $Text.IndexOf("      const defaultSectorId = Array.from(sectorIdByLocalId.values())[0];", $Start)

  if ($Start -lt 0 -or $End -lt 0) {
    throw "Nao encontrei bloco sessionIdByLocalId/sectorIdByLocalId para substituir."
  }

  $NewBlock = @'
      const sessionIdByLocalId = new Map<string, string>();
      const sectorIdByLocalId = new Map<string, string>();
      const existingSessionsByOrder = [...existing.sessions].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.createdAt.getTime() - b.createdAt.getTime(),
      );
      const existingSectorsByOrder = [...existing.sectors].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.createdAt.getTime() - b.createdAt.getTime(),
      );

      for (const [index, session] of (body.sessions || []).entries()) {
        const sessionData = {
          name: text(session.name) || `Data ${index + 1}`,
          description: text(session.description),
          startsAt: dateValue(session.startsAt) || existing.eventDate,
          endsAt: dateValue(session.endsAt),
          capacity: intValue(session.capacity),
          status: text(session.status) || 'ACTIVE',
          displayOrder: session.displayOrder ?? index,
        };

        const previousSession = hasOrders ? existingSessionsByOrder[index] : undefined;
        const saved = previousSession
          ? await tx.eventSession.update({
              where: { id: previousSession.id },
              data: sessionData,
            })
          : await tx.eventSession.create({
              data: {
                eventId: id,
                ...sessionData,
              },
            });

        if (session.localId) sessionIdByLocalId.set(session.localId, saved.id);
        sessionIdByLocalId.set(saved.id, saved.id);
      }

      if (hasOrders) {
        for (const session of existingSessionsByOrder) {
          sessionIdByLocalId.set(session.id, session.id);
        }
      }

      for (const [index, sector] of (body.sectors || []).entries()) {
        const sectorData = {
          name: text(sector.name) || `Setor ${index + 1}`,
          description: text(sector.description),
          type: text(sector.type),
          occupancyMode: occupancy(sector.occupancyMode),
          capacity: intValue(sector.capacity),
          displayOrder: sector.displayOrder ?? index,
          color: text(sector.color),
          gateName: text(sector.gateName),
        };

        const previousSector = hasOrders ? existingSectorsByOrder[index] : undefined;
        const saved = previousSector
          ? await tx.venueSector.update({
              where: { id: previousSector.id },
              data: sectorData,
            })
          : await tx.venueSector.create({
              data: {
                eventId: id,
                ...sectorData,
              },
            });

        if (sector.localId) sectorIdByLocalId.set(sector.localId, saved.id);
        sectorIdByLocalId.set(saved.id, saved.id);
      }

      if (hasOrders) {
        for (const sector of existingSectorsByOrder) {
          sectorIdByLocalId.set(sector.id, sector.id);
        }
      }

'@

  $Text = $Text.Substring(0, $Start) + $NewBlock + $Text.Substring($End)
  Write-Host "Bloco de datas/setores substituido por atualizacao sem duplicar." -ForegroundColor Green
}

Set-Content -Path $ControllerPath -Value $Text -Encoding UTF8

Write-Host "v43b aplicada com sucesso." -ForegroundColor Green
Write-Host "Agora reinicie a API e rode novamente o teste v2." -ForegroundColor Cyan

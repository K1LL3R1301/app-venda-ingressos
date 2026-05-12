import { Body, Controller, NotFoundException, Param, Patch } from '@nestjs/common';
import { EventOccupancyMode, Prisma, SeatMapObjectType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

function normalizeString(value?: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeNumber(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return undefined;

  const numeric =
    typeof value === 'number' ? value : Number(String(value).replace(',', '.'));

  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeInt(value?: string | number | null) {
  const numeric = normalizeNumber(value);
  if (numeric === undefined) return undefined;
  const parsed = Math.round(numeric);
  return parsed > 0 ? parsed : undefined;
}

function normalizeKey(value?: string | null) {
  return normalizeString(value)
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'E')
    .replace(/\//g, '_')
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
    .toUpperCase();
}

function normalizeOccupancyMode(value?: string | null): EventOccupancyMode {
  const key = normalizeKey(value);

  if (key && EventOccupancyMode[key as keyof typeof EventOccupancyMode]) {
    return EventOccupancyMode[key as keyof typeof EventOccupancyMode];
  }

  const aliases: Record<string, EventOccupancyMode> = {
    GERAL: EventOccupancyMode.GENERAL_ADMISSION,
    ENTRADA_GERAL: EventOccupancyMode.GENERAL_ADMISSION,
    ASSENTO: EventOccupancyMode.RESERVED_SEATING,
    ASSENTOS: EventOccupancyMode.RESERVED_SEATING,
    CADEIRA: EventOccupancyMode.RESERVED_SEATING,
    CADEIRAS: EventOccupancyMode.RESERVED_SEATING,
    MESA: EventOccupancyMode.RESERVED_TABLE,
    MESAS: EventOccupancyMode.RESERVED_TABLE,
    MISTO: EventOccupancyMode.MIXED,
  };

  return aliases[key || ''] || EventOccupancyMode.GENERAL_ADMISSION;
}

function normalizeSeatMapObjectType(value?: string | null): SeatMapObjectType {
  const key = normalizeKey(value);

  if (key && SeatMapObjectType[key as keyof typeof SeatMapObjectType]) {
    return SeatMapObjectType[key as keyof typeof SeatMapObjectType];
  }

  const aliases: Record<string, SeatMapObjectType> = {
    ASSENTO: SeatMapObjectType.SEAT,
    CADEIRA: SeatMapObjectType.SEAT,
    MESA: SeatMapObjectType.TABLE,
    CAMAROTE: SeatMapObjectType.BOOTH,
    AREA: SeatMapObjectType.AREA,
    SETOR: SeatMapObjectType.AREA,
    PALCO: SeatMapObjectType.STAGE,
    TELA: SeatMapObjectType.SCREEN,
    CORREDOR: SeatMapObjectType.AISLE,
    BLOQUEADO: SeatMapObjectType.BLOCKED_SPACE,
  };

  return aliases[key || ''] || SeatMapObjectType.AREA;
}

@Controller('events')
export class EventMapController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  @Patch(':id/map')
  async updateMap(@Param('id') id: string, @Body() body: UpdateEventDto) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
      include: {
        sectors: true,
      },
    });

    if (!existingEvent) {
      throw new NotFoundException('Evento não encontrado');
    }

    const eventOccupancyMode = body.occupancyMode
      ? normalizeOccupancyMode(body.occupancyMode)
      : existingEvent.occupancyMode;

    await this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          occupancyMode: eventOccupancyMode,
          allowSeatMap: body.allowSeatMap ?? existingEvent.allowSeatMap,
          allowTableMap: body.allowTableMap ?? existingEvent.allowTableMap,
        },
      });

      const existingSectorIds = new Set(
        existingEvent.sectors.map((sector) => sector.id),
      );
      const sectorIdByLocalId = new Map<string, string>();

      for (const sector of body.sectors || []) {
        const name = normalizeString(sector.name);
        if (!name) continue;

        const localId = normalizeString(sector.localId);
        const sectorOccupancyMode = sector.occupancyMode
          ? normalizeOccupancyMode(sector.occupancyMode)
          : eventOccupancyMode;

        if (localId && existingSectorIds.has(localId)) {
          const updatedSector = await tx.venueSector.update({
            where: { id: localId },
            data: {
              name,
              description: normalizeString(sector.description),
              type: normalizeString(sector.type),
              occupancyMode: sectorOccupancyMode,
              capacity: normalizeInt(sector.capacity),
              displayOrder: sector.displayOrder ?? 0,
              color: normalizeString(sector.color),
              gateName: normalizeString(sector.gateName),
            },
          });

          sectorIdByLocalId.set(localId, updatedSector.id);
          continue;
        }

        const createdSector = await tx.venueSector.create({
          data: {
            eventId: id,
            name,
            description: normalizeString(sector.description),
            type: normalizeString(sector.type),
            occupancyMode: sectorOccupancyMode,
            capacity: normalizeInt(sector.capacity),
            displayOrder: sector.displayOrder ?? sectorIdByLocalId.size,
            color: normalizeString(sector.color),
            gateName: normalizeString(sector.gateName),
          },
        });

        if (localId) {
          sectorIdByLocalId.set(localId, createdSector.id);
        }
      }

      const defaultSectorId =
        Array.from(sectorIdByLocalId.values())[0] || existingEvent.sectors[0]?.id;

      await tx.venueLayout.deleteMany({
        where: {
          eventId: id,
        },
      });

      for (const layout of body.venueLayouts || []) {
        const name = normalizeString(layout.name);
        if (!name) continue;

        const createdLayout = await tx.venueLayout.create({
          data: {
            eventId: id,
            name,
            occupancyMode: layout.occupancyMode
              ? normalizeOccupancyMode(layout.occupancyMode)
              : eventOccupancyMode,
            width: normalizeInt(layout.width),
            height: normalizeInt(layout.height),
            mapData: layout.mapData
              ? (layout.mapData as Prisma.InputJsonValue)
              : undefined,
            isDefault: layout.isDefault ?? true,
            status: normalizeString(layout.status) || 'ACTIVE',
          },
        });

        for (const object of layout.objects || []) {
          const code = normalizeString(object.code);
          if (!code) continue;

          const objectSectorId =
            (object.venueSectorLocalId
              ? sectorIdByLocalId.get(object.venueSectorLocalId)
              : undefined) ||
            (object.venueSectorId && existingSectorIds.has(object.venueSectorId)
              ? object.venueSectorId
              : undefined) ||
            defaultSectorId;

          await tx.seatMapObject.create({
            data: {
              layoutId: createdLayout.id,
              venueSectorId: objectSectorId,
              code,
              label: normalizeString(object.label),
              type: normalizeSeatMapObjectType(object.type),
              row: normalizeString(object.row),
              number: normalizeString(object.number),
              capacity: normalizeInt(object.capacity) ?? 1,
              x: normalizeNumber(object.x),
              y: normalizeNumber(object.y),
              width: normalizeNumber(object.width),
              height: normalizeNumber(object.height),
              rotation: normalizeNumber(object.rotation),
              status: normalizeString(object.status) || 'AVAILABLE',
              metadata: object.metadata
                ? (object.metadata as Prisma.InputJsonValue)
                : undefined,
            },
          });
        }
      }
    });

    return this.eventsService.findById(id);
  }
}

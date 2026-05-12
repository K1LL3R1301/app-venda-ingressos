import { Body, Controller, NotFoundException, Param, Patch } from '@nestjs/common';
import { EventOccupancyMode, Prisma, SeatMapObjectType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

function text(value?: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function numberValue(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return undefined;
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : undefined;
}

function intValue(value?: string | number | null) {
  const numeric = numberValue(value);
  if (numeric === undefined) return undefined;
  const parsed = Math.round(numeric);
  return parsed > 0 ? parsed : undefined;
}

function key(value?: string | null) {
  return text(value)
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'E')
    .replace(/\//g, '_')
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
    .toUpperCase();
}

function occupancy(value?: string | null): EventOccupancyMode {
  const normalized = key(value);
  if (normalized && EventOccupancyMode[normalized as keyof typeof EventOccupancyMode]) {
    return EventOccupancyMode[normalized as keyof typeof EventOccupancyMode];
  }
  return EventOccupancyMode.GENERAL_ADMISSION;
}

function objectType(value?: string | null): SeatMapObjectType {
  const normalized = key(value);
  if (normalized && SeatMapObjectType[normalized as keyof typeof SeatMapObjectType]) {
    return SeatMapObjectType[normalized as keyof typeof SeatMapObjectType];
  }

  const aliases: Record<string, SeatMapObjectType> = {
    AREA: SeatMapObjectType.AREA,
    SETOR: SeatMapObjectType.AREA,
    TABLE: SeatMapObjectType.TABLE,
    MESA: SeatMapObjectType.TABLE,
    SEAT: SeatMapObjectType.SEAT,
    ASSENTO: SeatMapObjectType.SEAT,
    STAGE: SeatMapObjectType.STAGE,
    PALCO: SeatMapObjectType.STAGE,
    AISLE: SeatMapObjectType.AISLE,
    CORREDOR: SeatMapObjectType.AISLE,
    BOOTH: SeatMapObjectType.BOOTH,
    CAMAROTE: SeatMapObjectType.BOOTH,
    BLOCKED_SPACE: SeatMapObjectType.BLOCKED_SPACE,
    BLOQUEIO: SeatMapObjectType.BLOCKED_SPACE,
  };

  return aliases[normalized || ''] || SeatMapObjectType.AREA;
}

function dateValue(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

@Controller('events')
export class EventFullUpdateController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  @Patch(':id/full')
  async updateFull(@Param('id') id: string, @Body() body: CreateEventDto) {
    const existing = await this.prisma.event.findUnique({
      where: { id },
      include: {
        content: true,
        location: true,
        media: true,
        policy: true,
        sessions: true,
        sectors: true,
        ticketTypes: true,
        venueLayouts: true,
        orders: { select: { id: true }, take: 1 },
      },
    });

    if (!existing) {
      throw new NotFoundException('Evento não encontrado');
    }

    const eventOccupancyMode = occupancy(body.occupancyMode) || existing.occupancyMode;
    const hasOrders = existing.orders.length > 0;

    return this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          organizerId: text(body.organizerId) || existing.organizerId,
          name: text(body.name) || existing.name,
          slug: text(body.slug),
          description: text(body.description),
          shortDescription: text(body.shortDescription),
          category: body.category as any,
          status: text(body.status) || existing.status,
          visibility: text(body.visibility) || existing.visibility,
          timezone: text(body.timezone) || existing.timezone,
          eventDate: dateValue(body.eventDate) || existing.eventDate,
          startDate: dateValue(body.startDate),
          endDate: dateValue(body.endDate),
          capacity: intValue(body.capacity) || existing.capacity,
          occupancyMode: eventOccupancyMode,
          multiSession: (body.sessions?.length || 0) > 1,
          allowSeatMap: body.allowSeatMap ?? existing.allowSeatMap,
          allowTableMap: body.allowTableMap ?? existing.allowTableMap,
          featured: body.featured ?? existing.featured,
          highlightTag: text(body.highlightTag),
          checkoutTitle: text(body.checkoutTitle),
          checkoutSubtitle: text(body.checkoutSubtitle),
        },
      });

      if (body.content) {
        await tx.eventContent.upsert({
          where: { eventId: id },
          create: {
            eventId: id,
            headline: text(body.content.headline),
            summary: text(body.content.summary),
            fullDescription: text(body.content.fullDescription),
            attractions: text(body.content.attractions),
            schedule: text(body.content.schedule),
            sectorDetails: text(body.content.sectorDetails),
            importantInfo: text(body.content.importantInfo),
            faq: text(body.content.faq),
            producerDescription: text(body.content.producerDescription),
            purchaseInstructions: text(body.content.purchaseInstructions),
          },
          update: {
            headline: text(body.content.headline),
            summary: text(body.content.summary),
            fullDescription: text(body.content.fullDescription),
            attractions: text(body.content.attractions),
            schedule: text(body.content.schedule),
            sectorDetails: text(body.content.sectorDetails),
            importantInfo: text(body.content.importantInfo),
            faq: text(body.content.faq),
            producerDescription: text(body.content.producerDescription),
            purchaseInstructions: text(body.content.purchaseInstructions),
          },
        });
      }

      if (body.location) {
        await tx.eventLocation.upsert({
          where: { eventId: id },
          create: {
            eventId: id,
            mode: text(body.location.mode) || 'PRESENTIAL',
            venueName: text(body.location.venueName),
            addressLine1: text(body.location.addressLine1),
            addressLine2: text(body.location.addressLine2),
            neighborhood: text(body.location.neighborhood),
            city: text(body.location.city),
            state: text(body.location.state)?.toUpperCase(),
            zipCode: text(body.location.zipCode),
            reference: text(body.location.reference),
            mapUrl: text(body.location.mapUrl),
            instructions: text(body.location.instructions),
            latitude: numberValue(body.location.latitude),
            longitude: numberValue(body.location.longitude),
          },
          update: {
            mode: text(body.location.mode) || 'PRESENTIAL',
            venueName: text(body.location.venueName),
            addressLine1: text(body.location.addressLine1),
            addressLine2: text(body.location.addressLine2),
            neighborhood: text(body.location.neighborhood),
            city: text(body.location.city),
            state: text(body.location.state)?.toUpperCase(),
            zipCode: text(body.location.zipCode),
            reference: text(body.location.reference),
            mapUrl: text(body.location.mapUrl),
            instructions: text(body.location.instructions),
            latitude: numberValue(body.location.latitude),
            longitude: numberValue(body.location.longitude),
          },
        });
      }

      if (body.media) {
        await tx.eventMedia.upsert({
          where: { eventId: id },
          create: {
            eventId: id,
            coverImageUrl: text(body.media.coverImageUrl),
            bannerImageUrl: text(body.media.bannerImageUrl),
            thumbnailUrl: text(body.media.thumbnailUrl),
            mobileBannerUrl: text(body.media.mobileBannerUrl),
            sectorMapImageUrl: text(body.media.sectorMapImageUrl),
            gallery: body.media.gallery?.length ? (body.media.gallery as Prisma.InputJsonValue) : undefined,
          },
          update: {
            coverImageUrl: text(body.media.coverImageUrl),
            bannerImageUrl: text(body.media.bannerImageUrl),
            thumbnailUrl: text(body.media.thumbnailUrl),
            mobileBannerUrl: text(body.media.mobileBannerUrl),
            sectorMapImageUrl: text(body.media.sectorMapImageUrl),
            gallery: body.media.gallery?.length ? (body.media.gallery as Prisma.InputJsonValue) : undefined,
          },
        });
      }

      if (body.policy) {
        await tx.eventPolicy.upsert({
          where: { eventId: id },
          create: {
            eventId: id,
            ageRating: text(body.policy.ageRating),
            refundPolicy: text(body.policy.refundPolicy),
            halfEntryPolicy: text(body.policy.halfEntryPolicy),
            transferPolicy: text(body.policy.transferPolicy),
            termsNotes: text(body.policy.termsNotes),
            entryRules: text(body.policy.entryRules),
            documentRules: text(body.policy.documentRules),
          },
          update: {
            ageRating: text(body.policy.ageRating),
            refundPolicy: text(body.policy.refundPolicy),
            halfEntryPolicy: text(body.policy.halfEntryPolicy),
            transferPolicy: text(body.policy.transferPolicy),
            termsNotes: text(body.policy.termsNotes),
            entryRules: text(body.policy.entryRules),
            documentRules: text(body.policy.documentRules),
          },
        });
      }

      await tx.venueLayout.deleteMany({ where: { eventId: id } });

      if (!hasOrders) {
        await tx.ticketType.deleteMany({ where: { eventId: id } });
        await tx.eventSession.deleteMany({ where: { eventId: id } });
        await tx.venueSector.deleteMany({ where: { eventId: id } });
      }

      const sessionIdByLocalId = new Map<string, string>();
      const sectorIdByLocalId = new Map<string, string>();

      for (const [index, session] of (body.sessions || []).entries()) {
        const created = await tx.eventSession.create({
          data: {
            eventId: id,
            name: text(session.name) || `Data ${index + 1}`,
            description: text(session.description),
            startsAt: dateValue(session.startsAt) || existing.eventDate,
            endsAt: dateValue(session.endsAt),
            capacity: intValue(session.capacity),
            status: text(session.status) || 'ACTIVE',
            displayOrder: session.displayOrder ?? index,
          },
        });

        if (session.localId) sessionIdByLocalId.set(session.localId, created.id);
      }

      for (const [index, sector] of (body.sectors || []).entries()) {
        const created = await tx.venueSector.create({
          data: {
            eventId: id,
            name: text(sector.name) || `Setor ${index + 1}`,
            description: text(sector.description),
            type: text(sector.type),
            occupancyMode: occupancy(sector.occupancyMode),
            capacity: intValue(sector.capacity),
            displayOrder: sector.displayOrder ?? index,
            color: text(sector.color),
            gateName: text(sector.gateName),
          },
        });

        if (sector.localId) sectorIdByLocalId.set(sector.localId, created.id);
      }

      const defaultSectorId = Array.from(sectorIdByLocalId.values())[0];

      for (const layout of body.venueLayouts || []) {
        const createdLayout = await tx.venueLayout.create({
          data: {
            eventId: id,
            name: text(layout.name) || 'Mapa do evento',
            occupancyMode: occupancy(layout.occupancyMode),
            width: intValue(layout.width),
            height: intValue(layout.height),
            mapData: layout.mapData ? (layout.mapData as Prisma.InputJsonValue) : undefined,
            isDefault: layout.isDefault ?? true,
            status: text(layout.status) || 'ACTIVE',
          },
        });

        for (const object of layout.objects || []) {
          await tx.seatMapObject.create({
            data: {
              layoutId: createdLayout.id,
              venueSectorId: (object.venueSectorLocalId ? sectorIdByLocalId.get(object.venueSectorLocalId) : undefined) || text(object.venueSectorId) || defaultSectorId,
              code: text(object.code) || `OBJ-${Date.now()}`,
              label: text(object.label),
              type: objectType(object.type),
              row: text(object.row),
              number: text(object.number),
              capacity: intValue(object.capacity) || 1,
              x: numberValue(object.x),
              y: numberValue(object.y),
              width: numberValue(object.width),
              height: numberValue(object.height),
              rotation: numberValue(object.rotation),
              status: text(object.status) || 'AVAILABLE',
              metadata: object.metadata ? (object.metadata as Prisma.InputJsonValue) : undefined,
            },
          });
        }
      }

      if (!hasOrders) {
        for (const [index, ticket] of (body.ticketTypes || []).entries()) {
          await tx.ticketType.create({
            data: {
              eventId: id,
              eventSessionId: ticket.eventSessionLocalId ? sessionIdByLocalId.get(ticket.eventSessionLocalId) : undefined,
              venueSectorId: ticket.venueSectorLocalId ? sectorIdByLocalId.get(ticket.venueSectorLocalId) : undefined,
              name: text(ticket.name) || `Ingresso ${index + 1}`,
              lotLabel: text(ticket.lotLabel),
              description: text(ticket.description),
              price: text(ticket.price) || '0.00',
              quantity: intValue(ticket.quantity) || 1,
              salesStartAt: dateValue(ticket.salesStartAt),
              salesEndAt: dateValue(ticket.salesEndAt),
              maxPerOrder: intValue(ticket.maxPerOrder),
              displayOrder: ticket.displayOrder ?? index,
              isHidden: ticket.isHidden ?? false,
              status: text(ticket.status) || 'ACTIVE',
              occupancyMode: occupancy(ticket.occupancyMode),
            },
          });
        }
      }
    });

    return this.eventsService.findById(id);
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventCollection,
  EventOccupancyMode,
  Prisma,
  SeatMapObjectType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

type LocalSessionPayload = {
  localId?: string;
  name: string;
  description?: string;
  startsAt: Date;
  endsAt?: Date;
  capacity?: number;
  status: string;
  displayOrder: number;
};

type LocalSectorPayload = {
  localId?: string;
  name: string;
  description?: string;
  type?: string;
  occupancyMode: EventOccupancyMode;
  capacity?: number;
  displayOrder: number;
  color?: string;
  gateName?: string;
};



type ScopeUser = {
  sub?: string;
  email?: string;
  role?: string;
  cpf?: string;
};
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  

  private normalizeScopeCpf(value?: string | null) {
    return String(value || '').replace(/\D/g, '');
  }

  private normalizeScopeEmail(value?: string | null) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized || undefined;
  }

  private organizerScopeWhere(user?: ScopeUser): Prisma.OrganizerWhereInput {
    const email = this.normalizeScopeEmail(user?.email);
    const cpf = this.normalizeScopeCpf(user?.cpf);
    const or: Prisma.OrganizerWhereInput[] = [];

    if (user?.sub) or.push({ ownerUserId: user.sub });
    if (email) or.push({ email });
    if (cpf) or.push({ document: cpf });

    return or.length > 0 ? { OR: or } : { id: '__NO_ORGANIZER_SCOPE__' };
  }
private eventInclude() {
    return {
      organizer: true,
      ticketTypes: {
        orderBy: {
          displayOrder: 'asc' as const,
        },
        include: {
          eventSession: true,
          venueSector: true,
        },
      },
      content: true,
      location: true,
      media: true,
      policy: true,
      sessions: {
        orderBy: [
          {
            displayOrder: 'asc' as const,
          },
          {
            startsAt: 'asc' as const,
          },
        ],
      },
      sectors: {
        orderBy: [
          {
            displayOrder: 'asc' as const,
          },
          {
            name: 'asc' as const,
          },
        ],
      },
      venueLayouts: {
        include: {
          mapObjects: {
            orderBy: {
              code: 'asc' as const,
            },
          },
        },
      },
    };
  }

  private normalizeString(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private normalizeNumber(value?: string | number | null) {
    if (value === undefined || value === null || value === '') return undefined;

    const numeric =
      typeof value === 'number'
        ? value
        : Number(String(value).replace(',', '.'));

    return Number.isNaN(numeric) ? undefined : numeric;
  }

  private normalizeEventCollection(
    value?: string | null,
  ): EventCollection | undefined {
    const normalized = this.normalizeString(value);

    if (!normalized) return undefined;

    const key = normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, 'E')
      .replace(/\//g, '_')
      .replace(/-/g, '_')
      .replace(/\s+/g, '_')
      .toUpperCase();

    const directMatch = EventCollection[key as keyof typeof EventCollection];

    if (directMatch) {
      return directMatch;
    }

    const aliases: Record<string, EventCollection> = {
      FESTAS_E_SHOWS: EventCollection.FESTAS_SHOWS,
      FESTAS_SHOWS: EventCollection.FESTAS_SHOWS,
      SHOWS: EventCollection.FESTAS_SHOWS,
      FESTIVAL: EventCollection.FESTAS_SHOWS,
      FESTIVAIS: EventCollection.FESTAS_SHOWS,

      TEATRO: EventCollection.TEATROS_ESPETACULOS,
      TEATROS: EventCollection.TEATROS_ESPETACULOS,
      TEATRO_E_ESPETACULOS: EventCollection.TEATROS_ESPETACULOS,
      TEATROS_E_ESPETACULOS: EventCollection.TEATROS_ESPETACULOS,
      ESPETACULOS: EventCollection.TEATROS_ESPETACULOS,

      STAND_UP: EventCollection.STAND_UP_COMEDY,
      STANDUP: EventCollection.STAND_UP_COMEDY,
      COMEDY: EventCollection.STAND_UP_COMEDY,
      COMEDIA: EventCollection.STAND_UP_COMEDY,
      STAND_UP_COMEDY: EventCollection.STAND_UP_COMEDY,

      ESPORTE: EventCollection.ESPORTES,
      ESPORTES: EventCollection.ESPORTES,

      PASSEIO: EventCollection.PASSEIOS_TOURS,
      PASSEIOS: EventCollection.PASSEIOS_TOURS,
      TOUR: EventCollection.PASSEIOS_TOURS,
      TOURS: EventCollection.PASSEIOS_TOURS,
      PASSEIOS_E_TOURS: EventCollection.PASSEIOS_TOURS,

      CONGRESSO: EventCollection.CONGRESSOS,
      CONGRESSOS: EventCollection.CONGRESSOS,
      PALESTRA: EventCollection.CONGRESSOS,
      PALESTRAS: EventCollection.CONGRESSOS,

      INFANTIL: EventCollection.INFANTIL,
      CRIANCAS: EventCollection.INFANTIL,

      GASTRONOMIA: EventCollection.GASTRONOMIA,
      BAR: EventCollection.GASTRONOMIA,
      BARES: EventCollection.GASTRONOMIA,
      RESTAURANTE: EventCollection.GASTRONOMIA,
      RESTAURANTES: EventCollection.GASTRONOMIA,
    };

    return aliases[key];
  }

  private normalizeOccupancyMode(
    value?: string | null,
  ): EventOccupancyMode | undefined {
    const normalized = this.normalizeString(value);

    if (!normalized) return undefined;

    const key = normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, 'E')
      .replace(/\//g, '_')
      .replace(/-/g, '_')
      .replace(/\s+/g, '_')
      .toUpperCase();

    const directMatch =
      EventOccupancyMode[key as keyof typeof EventOccupancyMode];

    if (directMatch) {
      return directMatch;
    }

    const aliases: Record<string, EventOccupancyMode> = {
      GERAL: EventOccupancyMode.GENERAL_ADMISSION,
      ENTRADA_GERAL: EventOccupancyMode.GENERAL_ADMISSION,
      GENERAL: EventOccupancyMode.GENERAL_ADMISSION,
      GENERAL_ADMISSION: EventOccupancyMode.GENERAL_ADMISSION,

      ASSENTO: EventOccupancyMode.RESERVED_SEATING,
      ASSENTOS: EventOccupancyMode.RESERVED_SEATING,
      ASSENTO_MARCADO: EventOccupancyMode.RESERVED_SEATING,
      ASSENTOS_MARCADOS: EventOccupancyMode.RESERVED_SEATING,
      RESERVED_SEATING: EventOccupancyMode.RESERVED_SEATING,

      MESA: EventOccupancyMode.RESERVED_TABLE,
      MESAS: EventOccupancyMode.RESERVED_TABLE,
      MESA_MARCADA: EventOccupancyMode.RESERVED_TABLE,
      MESAS_MARCADAS: EventOccupancyMode.RESERVED_TABLE,
      RESERVED_TABLE: EventOccupancyMode.RESERVED_TABLE,

      MISTO: EventOccupancyMode.MIXED,
      MIXED: EventOccupancyMode.MIXED,
    };

    return aliases[key];
  }

  private inferOccupancyModeByCategory(
    category?: EventCollection,
  ): EventOccupancyMode {
    if (category === EventCollection.TEATROS_ESPETACULOS) {
      return EventOccupancyMode.RESERVED_SEATING;
    }

    if (category === EventCollection.CONGRESSOS) {
      return EventOccupancyMode.RESERVED_SEATING;
    }

    if (category === EventCollection.GASTRONOMIA) {
      return EventOccupancyMode.RESERVED_TABLE;
    }

    if (category === EventCollection.STAND_UP_COMEDY) {
      return EventOccupancyMode.MIXED;
    }

    return EventOccupancyMode.GENERAL_ADMISSION;
  }

  private resolveOccupancyMode(
    value?: string | null,
    category?: EventCollection,
  ): EventOccupancyMode {
    return (
      this.normalizeOccupancyMode(value) ||
      this.inferOccupancyModeByCategory(category)
    );
  }

  private normalizeSeatMapObjectType(
    value?: string | null,
  ): SeatMapObjectType {
    const normalized = this.normalizeString(value);

    if (!normalized) {
      return SeatMapObjectType.SEAT;
    }

    const key = normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, 'E')
      .replace(/\//g, '_')
      .replace(/-/g, '_')
      .replace(/\s+/g, '_')
      .toUpperCase();

    const directMatch =
      SeatMapObjectType[key as keyof typeof SeatMapObjectType];

    if (directMatch) {
      return directMatch;
    }

    const aliases: Record<string, SeatMapObjectType> = {
      ASSENTO: SeatMapObjectType.SEAT,
      CADEIRA: SeatMapObjectType.SEAT,
      SEAT: SeatMapObjectType.SEAT,

      ASSENTO_ACESSIVEL: SeatMapObjectType.ACCESSIBLE_SEAT,
      ACCESSIBLE_SEAT: SeatMapObjectType.ACCESSIBLE_SEAT,

      ACOMPANHANTE: SeatMapObjectType.COMPANION_SEAT,
      COMPANION_SEAT: SeatMapObjectType.COMPANION_SEAT,

      MESA: SeatMapObjectType.TABLE,
      TABLE: SeatMapObjectType.TABLE,

      CAMAROTE: SeatMapObjectType.BOOTH,
      BOOTH: SeatMapObjectType.BOOTH,

      BALCAO: SeatMapObjectType.COUNTER,
      COUNTER: SeatMapObjectType.COUNTER,

      AREA: SeatMapObjectType.AREA,
      SETOR: SeatMapObjectType.AREA,

      PALCO: SeatMapObjectType.STAGE,
      STAGE: SeatMapObjectType.STAGE,

      TELA: SeatMapObjectType.SCREEN,
      SCREEN: SeatMapObjectType.SCREEN,

      CORREDOR: SeatMapObjectType.AISLE,
      AISLE: SeatMapObjectType.AISLE,

      BLOQUEADO: SeatMapObjectType.BLOCKED_SPACE,
      BLOCKED_SPACE: SeatMapObjectType.BLOCKED_SPACE,
    };

    return aliases[key] || SeatMapObjectType.SEAT;
  }

  private hasContentData(data?: CreateEventDto['content']) {
    if (!data) return false;

    return Boolean(
      data.headline ||
        data.summary ||
        data.fullDescription ||
        data.attractions ||
        data.schedule ||
        data.sectorDetails ||
        data.importantInfo ||
        data.faq ||
        data.producerDescription ||
        data.purchaseInstructions,
    );
  }

  private hasLocationData(data?: CreateEventDto['location']) {
    if (!data) return false;

    return Boolean(
      data.mode ||
        data.venueName ||
        data.addressLine1 ||
        data.addressLine2 ||
        data.neighborhood ||
        data.city ||
        data.state ||
        data.zipCode ||
        data.reference ||
        data.mapUrl ||
        data.instructions ||
        data.latitude ||
        data.longitude,
    );
  }

  private hasMediaData(data?: CreateEventDto['media']) {
    if (!data) return false;

    return Boolean(
      data.coverImageUrl ||
        data.bannerImageUrl ||
        data.thumbnailUrl ||
        data.mobileBannerUrl ||
        data.sectorMapImageUrl ||
        (data.gallery && data.gallery.length > 0),
    );
  }

  private hasPolicyData(data?: CreateEventDto['policy']) {
    if (!data) return false;

    return Boolean(
      data.ageRating ||
        data.refundPolicy ||
        data.halfEntryPolicy ||
        data.transferPolicy ||
        data.termsNotes ||
        data.entryRules ||
        data.documentRules,
    );
  }

  private hasTicketTypesData(data?: CreateEventDto['ticketTypes']) {
    if (!data || data.length === 0) return false;

    return data.some(
      (ticketType) =>
        Boolean(ticketType.name?.trim()) &&
        Boolean(ticketType.price) &&
        Number(ticketType.quantity) > 0,
    );
  }

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
          `A capacidade da data ${session.name} nÃ£o pode ultrapassar a capacidade geral.`,
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
        'A soma das capacidades das datas nÃ£o pode ultrapassar a capacidade geral.',
      );
    }

    for (const [index, sector] of sectorsPayload.entries()) {
      const key = sector.localId || `sector-${index}`;
      const sectorCapacity = this.toCapacityInt(sector.capacity) || eventCapacity;

      if (sectorCapacity > eventCapacity) {
        throw new BadRequestException(
          `A capacidade do setor ${sector.name} nÃ£o pode ultrapassar a capacidade geral.`,
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
          `A soma dos setores (${sectorTotal}) nÃ£o pode ultrapassar a capacidade da data ${session.name} (${sessionCapacity}).`,
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
            'Ingressos ultrapassam a capacidade disponÃ­vel do setor nesta data. RefaÃ§a os lotes automaticamente.',
          );
        }

        if (nextSessionTotal > sessionCapacity) {
          throw new BadRequestException(
            'Ingressos ultrapassam a capacidade disponÃ­vel desta data. RefaÃ§a os lotes automaticamente.',
          );
        }

        usedBySessionAndSector.set(groupKey, nextGroupTotal);
        usedBySession.set(sessionKey, nextSessionTotal);
      }
    }
  }
  private buildContentPayload(data?: CreateEventDto['content']) {
    return {
      headline: this.normalizeString(data?.headline),
      summary: this.normalizeString(data?.summary),
      fullDescription: this.normalizeString(data?.fullDescription),
      attractions: this.normalizeString(data?.attractions),
      schedule: this.normalizeString(data?.schedule),
      sectorDetails: this.normalizeString(data?.sectorDetails),
      importantInfo: this.normalizeString(data?.importantInfo),
      faq: this.normalizeString(data?.faq),
      producerDescription: this.normalizeString(data?.producerDescription),
      purchaseInstructions: this.normalizeString(data?.purchaseInstructions),
    };
  }

  private buildLocationPayload(data?: CreateEventDto['location']) {
    return {
      mode: this.normalizeString(data?.mode) || 'PRESENTIAL',
      venueName: this.normalizeString(data?.venueName),
      addressLine1: this.normalizeString(data?.addressLine1),
      addressLine2: this.normalizeString(data?.addressLine2),
      neighborhood: this.normalizeString(data?.neighborhood),
      city: this.normalizeString(data?.city),
      state: this.normalizeString(data?.state)?.toUpperCase(),
      zipCode: this.normalizeString(data?.zipCode),
      reference: this.normalizeString(data?.reference),
      mapUrl: this.normalizeString(data?.mapUrl),
      instructions: this.normalizeString(data?.instructions),
      latitude: this.normalizeNumber(data?.latitude),
      longitude: this.normalizeNumber(data?.longitude),
    };
  }

  private buildMediaPayload(data?: CreateEventDto['media']) {
    return {
      coverImageUrl: this.normalizeString(data?.coverImageUrl),
      bannerImageUrl: this.normalizeString(data?.bannerImageUrl),
      thumbnailUrl: this.normalizeString(data?.thumbnailUrl),
      mobileBannerUrl: this.normalizeString(data?.mobileBannerUrl),
      sectorMapImageUrl: this.normalizeString(data?.sectorMapImageUrl),
      gallery:
        data?.gallery && data.gallery.length > 0
          ? (data.gallery as Prisma.InputJsonValue)
          : undefined,
    };
  }

  private buildPolicyPayload(data?: CreateEventDto['policy']) {
    return {
      ageRating: this.normalizeString(data?.ageRating),
      refundPolicy: this.normalizeString(data?.refundPolicy),
      halfEntryPolicy: this.normalizeString(data?.halfEntryPolicy),
      transferPolicy: this.normalizeString(data?.transferPolicy),
      termsNotes: this.normalizeString(data?.termsNotes),
      entryRules: this.normalizeString(data?.entryRules),
      documentRules: this.normalizeString(data?.documentRules),
    };
  }

  private buildSessionsPayload(data: CreateEventDto): LocalSessionPayload[] {
    const validSessions =
      data.sessions
        ?.filter((session) => session.name?.trim() && session.startsAt)
        .map((session, index) => ({
          localId: this.normalizeString(session.localId) || `session-${index}`,
          name: session.name.trim(),
          description: this.normalizeString(session.description),
          startsAt: new Date(session.startsAt),
          endsAt: session.endsAt ? new Date(session.endsAt) : undefined,
          capacity: session.capacity,
          status: this.normalizeString(session.status) || 'ACTIVE',
          displayOrder: session.displayOrder ?? index,
        })) || [];

    if (validSessions.length > 0) {
      return validSessions;
    }

    return [
      {
        localId: 'default-session',
        name: 'Data principal',
        description: undefined,
        startsAt: new Date(data.eventDate),
        endsAt: data.endDate ? new Date(data.endDate) : undefined,
        capacity: data.capacity,
        status: 'ACTIVE',
        displayOrder: 0,
      },
    ];
  }

  private buildDefaultSectorName(
    occupancyMode: EventOccupancyMode,
    category?: EventCollection,
  ) {
    if (occupancyMode === EventOccupancyMode.RESERVED_SEATING) {
      return 'Plateia';
    }

    if (occupancyMode === EventOccupancyMode.RESERVED_TABLE) {
      return 'Salão principal';
    }

    if (occupancyMode === EventOccupancyMode.MIXED) {
      if (category === EventCollection.STAND_UP_COMEDY) {
        return 'Área principal';
      }

      return 'Setor principal';
    }

    return 'Entrada geral';
  }

  private buildSectorsPayload(
    data: CreateEventDto,
    eventOccupancyMode: EventOccupancyMode,
    category?: EventCollection,
  ): LocalSectorPayload[] {
    const validSectors =
      data.sectors
        ?.filter((sector) => sector.name?.trim())
        .map((sector, index) => ({
          localId: this.normalizeString(sector.localId) || `sector-${index}`,
          name: sector.name.trim(),
          description: this.normalizeString(sector.description),
          type: this.normalizeString(sector.type),
          occupancyMode:
            this.normalizeOccupancyMode(sector.occupancyMode) ||
            eventOccupancyMode,
          capacity: sector.capacity,
          displayOrder: sector.displayOrder ?? index,
          color: this.normalizeString(sector.color),
          gateName: this.normalizeString(sector.gateName),
        })) || [];

    if (validSectors.length > 0) {
      return validSectors;
    }

    return [
      {
        localId: 'default-sector',
        name: this.buildDefaultSectorName(eventOccupancyMode, category),
        description: undefined,
        type: undefined,
        occupancyMode: eventOccupancyMode,
        capacity: data.capacity,
        displayOrder: 0,
        color: undefined,
        gateName: undefined,
      },
    ];
  }

  private buildTicketTypesPayload(
    data: CreateEventDto['ticketTypes'],
    sessionIdByLocalId: Map<string, string>,
    sectorIdByLocalId: Map<string, string>,
    defaultSectorId?: string,
  ) {
    return (
      data
        ?.filter(
          (ticketType) =>
            Boolean(ticketType.name?.trim()) &&
            Boolean(ticketType.price) &&
            Number(ticketType.quantity) > 0,
        )
        .map((ticketType, index) => {
          const eventSessionId =
            (ticketType.eventSessionLocalId
              ? sessionIdByLocalId.get(ticketType.eventSessionLocalId)
              : undefined) ||
            this.normalizeString(ticketType.eventSessionId) ||
            undefined;

          const venueSectorId =
            (ticketType.venueSectorLocalId
              ? sectorIdByLocalId.get(ticketType.venueSectorLocalId)
              : undefined) ||
            this.normalizeString(ticketType.venueSectorId) ||
            defaultSectorId ||
            undefined;

          return {
            eventSessionId,
            venueSectorId,
            name: ticketType.name.trim(),
            lotLabel: this.normalizeString(ticketType.lotLabel),
            description: this.normalizeString(ticketType.description),
            price: ticketType.price.replace(',', '.'),
            quantity: ticketType.quantity,
            salesStartAt: ticketType.salesStartAt
              ? new Date(ticketType.salesStartAt)
              : undefined,
            salesEndAt: ticketType.salesEndAt
              ? new Date(ticketType.salesEndAt)
              : undefined,
            minPerOrder: ticketType.minPerOrder,
            maxPerOrder: ticketType.maxPerOrder,
            displayOrder: ticketType.displayOrder ?? index,
            feeAmount: this.normalizeString(
              ticketType.feeAmount?.replace(',', '.'),
            ),
            feeDescription: this.normalizeString(ticketType.feeDescription),
            benefitDescription: this.normalizeString(
              ticketType.benefitDescription,
            ),
            isHidden: ticketType.isHidden ?? false,
            status: this.normalizeString(ticketType.status) || 'ACTIVE',
            occupancyMode:
              this.normalizeOccupancyMode(ticketType.occupancyMode) ||
              EventOccupancyMode.GENERAL_ADMISSION,
          };
        }) || []
    );
  }

  private ensureRequiredLocationForCreate(location?: CreateEventDto['location']) {
    if (!location) {
      throw new BadRequestException('A localização do evento é obrigatória.');
    }

    const venueName = this.normalizeString(location.venueName);
    const city = this.normalizeString(location.city);
    const state = this.normalizeString(location.state);

    if (!venueName) {
      throw new BadRequestException('O nome do local do evento é obrigatório.');
    }

    if (!city) {
      throw new BadRequestException('A cidade do evento é obrigatória.');
    }

    if (!state) {
      throw new BadRequestException('O estado do evento é obrigatório.');
    }
  }

  private ensureRequiredLocationForUpdate(
    existingLocation:
      | {
          venueName?: string | null;
          city?: string | null;
          state?: string | null;
        }
      | null
      | undefined,
    incomingLocation?: UpdateEventDto['location'],
  ) {
    if (!incomingLocation) {
      return;
    }

    const venueName = this.normalizeString(
      incomingLocation.venueName ?? existingLocation?.venueName ?? undefined,
    );
    const city = this.normalizeString(
      incomingLocation.city ?? existingLocation?.city ?? undefined,
    );
    const state = this.normalizeString(
      incomingLocation.state ?? existingLocation?.state ?? undefined,
    );

    if (!venueName) {
      throw new BadRequestException('O nome do local do evento é obrigatório.');
    }

    if (!city) {
      throw new BadRequestException('A cidade do evento é obrigatória.');
    }

    if (!state) {
      throw new BadRequestException('O estado do evento é obrigatório.');
    }
  }

  async create(data: CreateEventDto) {
    const organizer = await this.prisma.organizer.findUnique({
      where: { id: data.organizerId },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer não encontrado');
    }

    this.ensureRequiredLocationForCreate(data.location);

    const category = this.normalizeEventCollection(data.category);
    const occupancyMode = this.resolveOccupancyMode(
      data.occupancyMode,
      category,
    );

    const sessionsPayload = this.buildSessionsPayload(data);
    const sectorsPayload = this.buildSectorsPayload(
      data,
      occupancyMode,
      category,
    );

    this.ensureTicketCapacityForCreate(data, sessionsPayload, sectorsPayload);

    const shouldAllowSeatMap =
      data.allowSeatMap ??
      (occupancyMode === EventOccupancyMode.RESERVED_SEATING ||
        occupancyMode === EventOccupancyMode.MIXED);

    const shouldAllowTableMap =
      data.allowTableMap ??
      (occupancyMode === EventOccupancyMode.RESERVED_TABLE ||
        occupancyMode === EventOccupancyMode.MIXED);

    return this.prisma.$transaction(async (tx) => {
      const createdEvent = await tx.event.create({
        data: {
          organizerId: data.organizerId,
          name: data.name.trim(),
          description: this.normalizeString(data.description),
          eventDate: new Date(data.eventDate),
          capacity: data.capacity,
          status: this.normalizeString(data.status) || 'DRAFT',

          slug: this.normalizeString(data.slug),
          shortDescription: this.normalizeString(data.shortDescription),
          category,
          visibility: this.normalizeString(data.visibility) || 'PUBLIC',
          timezone: this.normalizeString(data.timezone) || 'America/Sao_Paulo',
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          saleStartAt: data.saleStartAt
            ? new Date(data.saleStartAt)
            : undefined,
          saleEndAt: data.saleEndAt ? new Date(data.saleEndAt) : undefined,
          featured: data.featured ?? false,
          highlightTag: this.normalizeString(data.highlightTag),
          checkoutTitle: this.normalizeString(data.checkoutTitle),
          checkoutSubtitle: this.normalizeString(data.checkoutSubtitle),

          occupancyMode,
          multiSession: data.multiSession ?? sessionsPayload.length > 1,
          allowSeatMap: shouldAllowSeatMap,
          allowTableMap: shouldAllowTableMap,

          content: this.hasContentData(data.content)
            ? {
                create: this.buildContentPayload(data.content),
              }
            : undefined,

          location: {
            create: this.buildLocationPayload(data.location),
          },

          media: this.hasMediaData(data.media)
            ? {
                create: this.buildMediaPayload(data.media),
              }
            : undefined,

          policy: this.hasPolicyData(data.policy)
            ? {
                create: this.buildPolicyPayload(data.policy),
              }
            : undefined,
        },
      });

      const sessionIdByLocalId = new Map<string, string>();

      for (const sessionPayload of sessionsPayload) {
        const createdSession = await tx.eventSession.create({
          data: {
            eventId: createdEvent.id,
            name: sessionPayload.name,
            description: sessionPayload.description,
            startsAt: sessionPayload.startsAt,
            endsAt: sessionPayload.endsAt,
            capacity: sessionPayload.capacity,
            status: sessionPayload.status,
            displayOrder: sessionPayload.displayOrder,
          },
        });

        if (sessionPayload.localId) {
          sessionIdByLocalId.set(sessionPayload.localId, createdSession.id);
        }
      }

      const sectorIdByLocalId = new Map<string, string>();
      let defaultSectorId: string | undefined;

      for (const sectorPayload of sectorsPayload) {
        const createdSector = await tx.venueSector.create({
          data: {
            eventId: createdEvent.id,
            name: sectorPayload.name,
            description: sectorPayload.description,
            type: sectorPayload.type,
            occupancyMode: sectorPayload.occupancyMode,
            capacity: sectorPayload.capacity,
            displayOrder: sectorPayload.displayOrder,
            color: sectorPayload.color,
            gateName: sectorPayload.gateName,
          },
        });

        if (!defaultSectorId) {
          defaultSectorId = createdSector.id;
        }

        if (sectorPayload.localId) {
          sectorIdByLocalId.set(sectorPayload.localId, createdSector.id);
        }
      }

      for (const layout of data.venueLayouts || []) {
        if (!layout.name?.trim()) continue;

        const createdLayout = await tx.venueLayout.create({
          data: {
            eventId: createdEvent.id,
            name: layout.name.trim(),
            occupancyMode:
              this.normalizeOccupancyMode(layout.occupancyMode) ||
              occupancyMode,
            width: layout.width,
            height: layout.height,
            mapData: layout.mapData
              ? (layout.mapData as Prisma.InputJsonValue)
              : undefined,
            isDefault: layout.isDefault ?? false,
            status: this.normalizeString(layout.status) || 'ACTIVE',
          },
        });

        for (const object of layout.objects || []) {
          if (!object.code?.trim()) continue;

          const venueSectorId =
            (object.venueSectorLocalId
              ? sectorIdByLocalId.get(object.venueSectorLocalId)
              : undefined) ||
            this.normalizeString(object.venueSectorId) ||
            defaultSectorId ||
            undefined;

          await tx.seatMapObject.create({
            data: {
              layoutId: createdLayout.id,
              venueSectorId,
              code: object.code.trim(),
              label: this.normalizeString(object.label),
              type: this.normalizeSeatMapObjectType(object.type),
              row: this.normalizeString(object.row),
              number: this.normalizeString(object.number),
              capacity: object.capacity ?? 1,
              x: object.x,
              y: object.y,
              width: object.width,
              height: object.height,
              rotation: object.rotation,
              status: this.normalizeString(object.status) || 'AVAILABLE',
              metadata: object.metadata
                ? (object.metadata as Prisma.InputJsonValue)
                : undefined,
            },
          });
        }
      }

      if (this.hasTicketTypesData(data.ticketTypes)) {
        const ticketTypesPayload = this.buildTicketTypesPayload(
          data.ticketTypes,
          sessionIdByLocalId,
          sectorIdByLocalId,
          defaultSectorId,
        );

        for (const ticketTypePayload of ticketTypesPayload) {
          await tx.ticketType.create({
            data: {
              eventId: createdEvent.id,
              eventSessionId: ticketTypePayload.eventSessionId,
              venueSectorId: ticketTypePayload.venueSectorId,
              name: ticketTypePayload.name,
              lotLabel: ticketTypePayload.lotLabel,
              description: ticketTypePayload.description,
              price: ticketTypePayload.price,
              quantity: ticketTypePayload.quantity,
              salesStartAt: ticketTypePayload.salesStartAt,
              salesEndAt: ticketTypePayload.salesEndAt,
              minPerOrder: ticketTypePayload.minPerOrder,
              maxPerOrder: ticketTypePayload.maxPerOrder,
              displayOrder: ticketTypePayload.displayOrder,
              feeAmount: ticketTypePayload.feeAmount,
              feeDescription: ticketTypePayload.feeDescription,
              benefitDescription: ticketTypePayload.benefitDescription,
              isHidden: ticketTypePayload.isHidden,
              status: ticketTypePayload.status,
              occupancyMode: ticketTypePayload.occupancyMode,
            },
          });
        }
      }

      return tx.event.findUniqueOrThrow({
        where: { id: createdEvent.id },
        include: this.eventInclude(),
      });
    });
  }

  async findAll() {
    return this.prisma.event.findMany({
      include: {
        organizer: true,
        media: true,
        location: true,
        sessions: {
          orderBy: [
            {
              displayOrder: 'asc',
            },
            {
              startsAt: 'asc',
            },
          ],
        },
        sectors: {
          orderBy: [
            {
              displayOrder: 'asc',
            },
            {
              name: 'asc',
            },
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }


  async findAdminScope(user: ScopeUser) {
    const role = String(user?.role || '').toUpperCase();

    if (role === 'SUPER_ADMIN') {
      return this.findAll();
    }

    return this.prisma.event.findMany({
      where: {
        organizer: this.organizerScopeWhere(user),
      },
      include: this.eventInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: this.eventInclude(),
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    return event;
  }

  async update(id: string, data: UpdateEventDto) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
      include: {
        content: true,
        location: true,
        media: true,
        policy: true,
      },
    });

    if (!existingEvent) {
      throw new NotFoundException('Evento não encontrado');
    }

    if (data.organizerId) {
      const organizer = await this.prisma.organizer.findUnique({
        where: { id: data.organizerId },
      });

      if (!organizer) {
        throw new NotFoundException('Organizer não encontrado');
      }
    }

    this.ensureRequiredLocationForUpdate(existingEvent.location, data.location);

    const incoming = data as UpdateEventDto & Partial<CreateEventDto>;
    const category = this.normalizeEventCollection(incoming.category);
    const occupancyMode = this.normalizeOccupancyMode(incoming.occupancyMode);

    return this.prisma.event.update({
      where: { id },
      data: {
        organizerId: data.organizerId,
        name: data.name?.trim(),
        description: this.normalizeString(data.description),
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        capacity: data.capacity,
        status: data.status,

        slug: this.normalizeString(data.slug),
        shortDescription: this.normalizeString(data.shortDescription),
        category,
        visibility: this.normalizeString(data.visibility),
        timezone: this.normalizeString(data.timezone),
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        saleStartAt: data.saleStartAt ? new Date(data.saleStartAt) : undefined,
        saleEndAt: data.saleEndAt ? new Date(data.saleEndAt) : undefined,
        featured: data.featured,
        highlightTag: this.normalizeString(data.highlightTag),
        checkoutTitle: this.normalizeString(data.checkoutTitle),
        checkoutSubtitle: this.normalizeString(data.checkoutSubtitle),

        occupancyMode,
        multiSession: incoming.multiSession,
        allowSeatMap: incoming.allowSeatMap,
        allowTableMap: incoming.allowTableMap,

        content: this.hasContentData(data.content)
          ? existingEvent.content
            ? {
                update: this.buildContentPayload(data.content),
              }
            : {
                create: this.buildContentPayload(data.content),
              }
          : undefined,

        location: this.hasLocationData(data.location)
          ? existingEvent.location
            ? {
                update: this.buildLocationPayload(data.location),
              }
            : {
                create: this.buildLocationPayload(data.location),
              }
          : undefined,

        media: this.hasMediaData(data.media)
          ? existingEvent.media
            ? {
                update: this.buildMediaPayload(data.media),
              }
            : {
                create: this.buildMediaPayload(data.media),
              }
          : undefined,

        policy: this.hasPolicyData(data.policy)
          ? existingEvent.policy
            ? {
                update: this.buildPolicyPayload(data.policy),
              }
            : {
                create: this.buildPolicyPayload(data.policy),
              }
          : undefined,
      },
      include: this.eventInclude(),
    });
  }
}

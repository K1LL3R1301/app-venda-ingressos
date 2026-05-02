import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeString(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
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
      mode: this.normalizeString(data?.mode),
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
      latitude: data?.latitude ? Number(data.latitude) : undefined,
      longitude: data?.longitude ? Number(data.longitude) : undefined,
    };
  }

  private buildMediaPayload(data?: CreateEventDto['media']) {
    return {
      coverImageUrl: this.normalizeString(data?.coverImageUrl),
      bannerImageUrl: this.normalizeString(data?.bannerImageUrl),
      thumbnailUrl: this.normalizeString(data?.thumbnailUrl),
      mobileBannerUrl: this.normalizeString(data?.mobileBannerUrl),
      sectorMapImageUrl: this.normalizeString(data?.sectorMapImageUrl),
      gallery: data?.gallery ?? undefined,
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

  private buildTicketTypesPayload(data?: CreateEventDto['ticketTypes']) {
    return (
      data
        ?.filter(
          (ticketType) =>
            Boolean(ticketType.name?.trim()) &&
            Boolean(ticketType.price) &&
            Number(ticketType.quantity) > 0,
        )
        .map((ticketType, index) => ({
          name: ticketType.name.trim(),
          lotLabel: this.normalizeString(ticketType.lotLabel),
          description: this.normalizeString(ticketType.description),
          price: ticketType.price,
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
          feeAmount: this.normalizeString(ticketType.feeAmount),
          feeDescription: this.normalizeString(ticketType.feeDescription),
          benefitDescription: this.normalizeString(
            ticketType.benefitDescription,
          ),
          isHidden: ticketType.isHidden,
          status: ticketType.status ?? 'ACTIVE',
        })) || []
    );
  }

  private ensureRequiredLocationForCreate(location?: CreateEventDto['location']) {
    if (!location) {
      throw new BadRequestException(
        'A localização do evento é obrigatória.',
      );
    }

    const venueName = this.normalizeString(location.venueName);
    const city = this.normalizeString(location.city);
    const state = this.normalizeString(location.state);

    if (!venueName) {
      throw new BadRequestException(
        'O nome do local do evento é obrigatório.',
      );
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
      throw new BadRequestException(
        'O nome do local do evento é obrigatório.',
      );
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

    return this.prisma.event.create({
      data: {
        organizerId: data.organizerId,
        name: data.name.trim(),
        description: this.normalizeString(data.description),
        eventDate: new Date(data.eventDate),
        capacity: data.capacity,
        status: data.status,

        slug: this.normalizeString(data.slug),
        shortDescription: this.normalizeString(data.shortDescription),
        category: this.normalizeString(data.category),
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

        ticketTypes: this.hasTicketTypesData(data.ticketTypes)
          ? {
              create: this.buildTicketTypesPayload(data.ticketTypes),
            }
          : undefined,
      },
      include: {
        organizer: true,
        ticketTypes: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
        content: true,
        location: true,
        media: true,
        policy: true,
      },
    });
  }

  async findAll() {
    return this.prisma.event.findMany({
      include: {
        organizer: true,
        media: true,
        location: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        organizer: true,
        ticketTypes: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
        content: true,
        location: true,
        media: true,
        policy: true,
      },
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
        category: this.normalizeString(data.category),
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
      include: {
        organizer: true,
        ticketTypes: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
        content: true,
        location: true,
        media: true,
        policy: true,
      },
    });
  }
}
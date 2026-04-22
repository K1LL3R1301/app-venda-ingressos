import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

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
      headline: data?.headline,
      summary: data?.summary,
      fullDescription: data?.fullDescription,
      attractions: data?.attractions,
      schedule: data?.schedule,
      sectorDetails: data?.sectorDetails,
      importantInfo: data?.importantInfo,
      faq: data?.faq,
      producerDescription: data?.producerDescription,
      purchaseInstructions: data?.purchaseInstructions,
    };
  }

  private buildLocationPayload(data?: CreateEventDto['location']) {
    return {
      mode: data?.mode,
      venueName: data?.venueName,
      addressLine1: data?.addressLine1,
      addressLine2: data?.addressLine2,
      neighborhood: data?.neighborhood,
      city: data?.city,
      state: data?.state,
      zipCode: data?.zipCode,
      reference: data?.reference,
      mapUrl: data?.mapUrl,
      instructions: data?.instructions,
      latitude: data?.latitude ? Number(data.latitude) : undefined,
      longitude: data?.longitude ? Number(data.longitude) : undefined,
    };
  }

  private buildMediaPayload(data?: CreateEventDto['media']) {
    return {
      coverImageUrl: data?.coverImageUrl,
      bannerImageUrl: data?.bannerImageUrl,
      thumbnailUrl: data?.thumbnailUrl,
      mobileBannerUrl: data?.mobileBannerUrl,
      sectorMapImageUrl: data?.sectorMapImageUrl,
      gallery: data?.gallery ?? undefined,
    };
  }

  private buildPolicyPayload(data?: CreateEventDto['policy']) {
    return {
      ageRating: data?.ageRating,
      refundPolicy: data?.refundPolicy,
      halfEntryPolicy: data?.halfEntryPolicy,
      transferPolicy: data?.transferPolicy,
      termsNotes: data?.termsNotes,
      entryRules: data?.entryRules,
      documentRules: data?.documentRules,
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
          lotLabel: ticketType.lotLabel,
          description: ticketType.description,
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
          feeAmount: ticketType.feeAmount,
          feeDescription: ticketType.feeDescription,
          benefitDescription: ticketType.benefitDescription,
          isHidden: ticketType.isHidden,
          status: ticketType.status ?? 'ACTIVE',
        })) || []
    );
  }

  async create(data: CreateEventDto) {
    const organizer = await this.prisma.organizer.findUnique({
      where: { id: data.organizerId },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer não encontrado');
    }

    return this.prisma.event.create({
      data: {
        organizerId: data.organizerId,
        name: data.name,
        description: data.description,
        eventDate: new Date(data.eventDate),
        capacity: data.capacity,
        status: data.status,

        slug: data.slug,
        shortDescription: data.shortDescription,
        category: data.category,
        visibility: data.visibility,
        timezone: data.timezone,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        saleStartAt: data.saleStartAt ? new Date(data.saleStartAt) : undefined,
        saleEndAt: data.saleEndAt ? new Date(data.saleEndAt) : undefined,
        featured: data.featured,
        highlightTag: data.highlightTag,
        checkoutTitle: data.checkoutTitle,
        checkoutSubtitle: data.checkoutSubtitle,

        content: this.hasContentData(data.content)
          ? {
              create: this.buildContentPayload(data.content),
            }
          : undefined,

        location: this.hasLocationData(data.location)
          ? {
              create: this.buildLocationPayload(data.location),
            }
          : undefined,

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

    return this.prisma.event.update({
      where: { id },
      data: {
        organizerId: data.organizerId,
        name: data.name,
        description: data.description,
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        capacity: data.capacity,
        status: data.status,

        slug: data.slug,
        shortDescription: data.shortDescription,
        category: data.category,
        visibility: data.visibility,
        timezone: data.timezone,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        saleStartAt: data.saleStartAt ? new Date(data.saleStartAt) : undefined,
        saleEndAt: data.saleEndAt ? new Date(data.saleEndAt) : undefined,
        featured: data.featured,
        highlightTag: data.highlightTag,
        checkoutTitle: data.checkoutTitle,
        checkoutSubtitle: data.checkoutSubtitle,

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
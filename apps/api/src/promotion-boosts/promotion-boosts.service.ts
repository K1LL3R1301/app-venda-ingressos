import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionBoostRequestDto } from './dto/create-promotion-boost-request.dto';
import { ReviewPromotionBoostRequestDto } from './dto/review-promotion-boost-request.dto';

type AuthenticatedUser = {
  sub: string;
  email: string;
  role: string;
  name?: string;
  cpf?: string;
};

type PlacementKey = 'MAIN_CAROUSEL' | 'PUBLICITY_BANNER' | 'SECTION_SPOT';

const BOOST_PLANS: Record<
  PlacementKey,
  {
    placement: PlacementKey;
    label: string;
    description: string;
    unitPriceCents: number;
    periodDays: number;
  }
> = {
  MAIN_CAROUSEL: {
    placement: 'MAIN_CAROUSEL',
    label: 'Carrossel principal',
    description:
      'Mantém o evento no carrossel principal da página inicial. Cobrança de R$ 250,00 a cada 15 dias até a data do evento.',
    unitPriceCents: 25000,
    periodDays: 15,
  },
  PUBLICITY_BANNER: {
    placement: 'PUBLICITY_BANNER',
    label: 'Banner de publicidade',
    description:
      'Exibe o evento no espaço de publicidade entre blocos da página. Cobrança de R$ 100,00 a cada mês até a data do evento.',
    unitPriceCents: 10000,
    periodDays: 30,
  },
  SECTION_SPOT: {
    placement: 'SECTION_SPOT',
    label: 'Espaços das seções',
    description:
      'Dá prioridade ao evento nos espaços de vitrine das seções e coleções. Cobrança de R$ 100,00 a cada mês até a data do evento.',
    unitPriceCents: 10000,
    periodDays: 30,
  },
};

function clean(value: unknown) {
  if (value === null || value === undefined) return '';

  return String(value).trim();
}

function makeProtocol() {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `ASTRO-IMP-${datePart}-${randomPart}`;
}

function parseEventDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Data do evento inválida');
  }

  return date;
}

function startOfToday() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return today;
}

function calculateCycles(eventDate: Date, periodDays: number) {
  const today = startOfToday();
  const end = new Date(eventDate);

  end.setHours(23, 59, 59, 999);

  if (end.getTime() < today.getTime()) {
    throw new BadRequestException(
      'A data do evento precisa ser hoje ou uma data futura',
    );
  }

  const diffMs = end.getTime() - today.getTime();
  const days = Math.max(1, Math.ceil(diffMs / 86400000));

  return Math.max(1, Math.ceil(days / periodDays));
}

@Injectable()
export class PromotionBoostsService {
  constructor(private readonly prisma: PrismaService) {}

  getPlans() {
    return Object.values(BOOST_PLANS);
  }

  async create(user: AuthenticatedUser, body: CreatePromotionBoostRequestDto) {
    const role = clean(user.role).toUpperCase();

    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new BadRequestException(
        'Apenas administradores podem solicitar impulsionamento',
      );
    }

    const eventTitle = clean(body.eventTitle);

    if (!eventTitle) {
      throw new BadRequestException('Informe o nome do evento');
    }

    const placement = clean(body.placement).toUpperCase() as PlacementKey;
    const plan = BOOST_PLANS[placement];

    if (!plan) {
      throw new BadRequestException('Local de impulsionamento inválido');
    }

    const eventDate = parseEventDate(body.eventDate);
    const cycles = calculateCycles(eventDate, plan.periodDays);
    const startsAt = startOfToday();
    const endsAt = new Date(eventDate);

    endsAt.setHours(23, 59, 59, 999);

    const totalAmountCents = cycles * plan.unitPriceCents;

    const request = await this.prisma.promotionBoostRequest.create({
      data: {
        protocol: makeProtocol(),
        requesterUserId: user.sub,
        requesterRole: role,
        requesterName: clean(user.name),
        requesterEmail: clean(user.email),
        requesterCpf: clean(user.cpf),
        eventId: clean(body.eventId) || null,
        eventTitle,
        eventDate,
        placement: plan.placement,
        placementLabel: plan.label,
        placementDescription: plan.description,
        periodDays: plan.periodDays,
        unitPriceCents: plan.unitPriceCents,
        cycles,
        totalAmountCents,
        startsAt,
        endsAt,
        paymentMethod: clean(body.paymentMethod) || 'Manual/Pix',
        paymentReference: clean(body.paymentReference),
        paymentProofText: clean(body.paymentProofText),
        notes: clean(body.notes),
        status: 'PAID_PENDING_REVIEW',
        paymentStatus: 'DECLARED_PAID',
        submittedAt: new Date(),
      },
    });

    return request;
  }

  async listMine(userId: string) {
    return this.prisma.promotionBoostRequest.findMany({
      where: {
        requesterUserId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async listForSuperAdmin() {
    return this.prisma.promotionBoostRequest.findMany({
      orderBy: [
        {
          status: 'asc',
        },
        {
          submittedAt: 'desc',
        },
      ],
    });
  }

  async listPublicApproved(placement?: string) {
    const now = new Date();
    const requestedPlacement = clean(placement).toUpperCase();

    return this.prisma.promotionBoostRequest.findMany({
      where: {
        status: 'APPROVED',
        startsAt: {
          lte: now,
        },
        endsAt: {
          gte: now,
        },
        ...(requestedPlacement
          ? {
              placement: requestedPlacement,
            }
          : {}),
      },
      orderBy: [
        {
          approvedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async review(
    id: string,
    moderator: AuthenticatedUser,
    body: ReviewPromotionBoostRequestDto,
  ) {
    const request = await this.prisma.promotionBoostRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Solicitação de impulsionamento não encontrada');
    }

    if (request.status !== 'PAID_PENDING_REVIEW') {
      throw new BadRequestException('Esta solicitação já foi analisada');
    }

    const moderatorNote = clean(body.moderatorNote);
    const now = new Date();

    return this.prisma.promotionBoostRequest.update({
      where: { id },
      data: {
        status: body.status,
        reviewedAt: now,
        approvedAt: body.status === 'APPROVED' ? now : null,
        rejectedAt: body.status === 'REJECTED' ? now : null,
        moderatorUserId: moderator.sub,
        moderatorName: clean(moderator.name) || 'Super Admin',
        moderatorEmail: clean(moderator.email),
        moderatorNote,
      },
    });
  }
}


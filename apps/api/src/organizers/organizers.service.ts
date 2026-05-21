import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateOrganizerDto } from './dto/create-organizer.dto';
import { UpdateOrganizerFeeConfigDto } from './dto/update-organizer-fee-config.dto';
import { PrismaService } from '../prisma/prisma.service';

type ScopeUser = {
  sub?: string;
  email?: string;
  role?: string;
  cpf?: string;
};

type NormalizedFeeInput = {
  percent: string;
  fixedCents: number;
  notes: string | null;
  status: string;
};

@Injectable()
export class OrganizersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCpf(value?: string | null) {
    return String(value || '').replace(/\D/g, '');
  }

  private normalizeEmail(value?: string | null) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized || undefined;
  }

  private organizerScopeWhere(user?: ScopeUser): Prisma.OrganizerWhereInput {
    const email = this.normalizeEmail(user?.email);
    const cpf = this.normalizeCpf(user?.cpf);
    const or: Prisma.OrganizerWhereInput[] = [];

    if (user?.sub) or.push({ ownerUserId: user.sub });
    if (email) or.push({ email });
    if (cpf) or.push({ document: cpf });

    return or.length > 0 ? { OR: or } : { id: '__NO_ORGANIZER_SCOPE__' };
  }

  private assertSuperAdmin(user?: ScopeUser) {
    const role = String(user?.role || '').toUpperCase();

    if (role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Somente SUPER_ADMIN pode gerenciar taxa do organizador.',
      );
    }
  }

  private async ensureOrganizerExists(organizerId: string) {
    const organizer = await this.prisma.organizer.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      throw new NotFoundException('Organizador nao encontrado.');
    }

    return organizer;
  }

  private normalizeFeeInput(data: UpdateOrganizerFeeConfigDto): NormalizedFeeInput {
    const percentRaw = data?.percent ?? 10;
    const fixedCentsRaw = data?.fixedCents ?? 0;

    const percent = Number(String(percentRaw).replace(',', '.'));
    const fixedCents = Number(fixedCentsRaw);

    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new BadRequestException('Percentual da taxa deve ficar entre 0 e 100.');
    }

    if (!Number.isFinite(fixedCents) || fixedCents < 0) {
      throw new BadRequestException('Taxa fixa em centavos deve ser maior ou igual a zero.');
    }

    const normalizedStatus = String(data?.status || 'ACTIVE').trim().toUpperCase();
    const allowedStatuses = new Set(['ACTIVE', 'INACTIVE']);

    if (!allowedStatuses.has(normalizedStatus)) {
      throw new BadRequestException('Status da taxa deve ser ACTIVE ou INACTIVE.');
    }

    const notes = String(data?.notes || '').trim();

    return {
      percent: percent.toFixed(2),
      fixedCents: Math.round(fixedCents),
      notes: notes || null,
      status: normalizedStatus,
    };
  }

  private serializeFeeConfig(config: any, organizerId: string) {
    if (!config) {
      return {
        id: null,
        organizerId,
        percent: 10,
        fixedCents: 0,
        fixedAmount: 0,
        notes: '',
        status: 'DEFAULT',
        isDefault: true,
        createdAt: null,
        updatedAt: null,
      };
    }

    const fixedCents = Number(config.fixedCents || 0);

    return {
      id: config.id,
      organizerId: config.organizerId,
      percent: Number(config.percent || 0),
      fixedCents,
      fixedAmount: fixedCents / 100,
      notes: config.notes || '',
      status: config.status,
      isDefault: false,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  async create(data: CreateOrganizerDto, user?: ScopeUser) {
    const role = String(user?.role || '').toUpperCase();

    return this.prisma.organizer.create({
      data: {
        ...data,
        ownerUserId: user?.sub && role !== 'OPERATOR' ? user.sub : undefined,
      },
    });
  }

  async findAll() {
    return this.prisma.organizer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        feeConfig: true,
      },
    });
  }

  async findAdminScope(user: ScopeUser) {
    const role = String(user?.role || '').toUpperCase();

    if (role === 'SUPER_ADMIN') {
      return this.findAll();
    }

    return this.prisma.organizer.findMany({
      where: this.organizerScopeWhere(user),
      orderBy: { createdAt: 'desc' },
      include: {
        feeConfig: true,
      },
    });
  }

  async getFeeConfig(organizerId: string, user?: ScopeUser) {
    this.assertSuperAdmin(user);
    await this.ensureOrganizerExists(organizerId);

    const config = await this.prisma.organizerFeeConfig.findUnique({
      where: { organizerId },
    });

    return this.serializeFeeConfig(config, organizerId);
  }

  async updateFeeConfig(
    organizerId: string,
    data: UpdateOrganizerFeeConfigDto,
    user?: ScopeUser,
  ) {
    this.assertSuperAdmin(user);
    await this.ensureOrganizerExists(organizerId);

    const normalized = this.normalizeFeeInput(data);

    const config = await this.prisma.organizerFeeConfig.upsert({
      where: { organizerId },
      create: {
        organizerId,
        percent: new Prisma.Decimal(normalized.percent),
        fixedCents: normalized.fixedCents,
        notes: normalized.notes,
        status: normalized.status,
      },
      update: {
        percent: new Prisma.Decimal(normalized.percent),
        fixedCents: normalized.fixedCents,
        notes: normalized.notes,
        status: normalized.status,
      },
    });

    return this.serializeFeeConfig(config, organizerId);
  }
}
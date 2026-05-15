import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateOrganizerDto } from './dto/create-organizer.dto';
import { PrismaService } from '../prisma/prisma.service';

type ScopeUser = {
  sub?: string;
  email?: string;
  role?: string;
  cpf?: string;
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
    });
  }
}

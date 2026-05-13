import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminSupportTicketDto } from './dto/create-admin-support-ticket.dto';
import { ReviewAdminSupportTicketDto } from './dto/review-admin-support-ticket.dto';

type AuthenticatedUser = {
  sub: string;
  email: string;
  role: string;
  name?: string;
  cpf?: string;
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

  return `ASTRO-SUP-${datePart}-${randomPart}`;
}

@Injectable()
export class AdminSupportTicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, body: CreateAdminSupportTicketDto) {
    const role = clean(user.role).toUpperCase();

    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new BadRequestException('Apenas administradores podem abrir suporte administrativo');
    }

    const eventTitle = clean(body.eventTitle);
    const subject = clean(body.subject);
    const message = clean(body.message);

    if (!eventTitle) {
      throw new BadRequestException('Informe o evento relacionado ao suporte');
    }

    if (!subject) {
      throw new BadRequestException('Informe o assunto do suporte');
    }

    if (!message) {
      throw new BadRequestException('Descreva o problema para o super administrador');
    }

    return this.prisma.adminSupportTicket.create({
      data: {
        protocol: makeProtocol(),
        requesterUserId: user.sub,
        requesterRole: role,
        requesterName: clean(user.name),
        requesterEmail: clean(user.email),
        requesterCpf: clean(user.cpf),
        eventId: clean(body.eventId) || null,
        eventTitle,
        subject,
        message,
        priority: clean(body.priority) || 'NORMAL',
        category: clean(body.category) || 'EVENT_SUPPORT',
        status: 'OPEN',
        submittedAt: new Date(),
      },
    });
  }

  async listMine(userId: string) {
    return this.prisma.adminSupportTicket.findMany({
      where: {
        requesterUserId: userId,
      },
      orderBy: [
        {
          updatedAt: 'desc',
        },
        {
          submittedAt: 'desc',
        },
      ],
    });
  }

  async listAll() {
    return this.prisma.adminSupportTicket.findMany({
      orderBy: [
        {
          status: 'asc',
        },
        {
          updatedAt: 'desc',
        },
      ],
    });
  }

  async review(
    id: string,
    moderator: AuthenticatedUser,
    body: ReviewAdminSupportTicketDto,
  ) {
    const ticket = await this.prisma.adminSupportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('Suporte administrativo não encontrado');
    }

    const nextStatus = clean(body.status) || (clean(body.replyText) ? 'ANSWERED' : 'IN_REVIEW');
    const replyText = clean(body.replyText);

    return this.prisma.adminSupportTicket.update({
      where: { id },
      data: {
        status: nextStatus,
        replyText: replyText || ticket.replyText,
        repliedAt: replyText ? new Date() : ticket.repliedAt,
        moderatorUserId: moderator.sub,
        moderatorName: clean(moderator.name) || 'Super Admin',
        moderatorEmail: clean(moderator.email),
      },
    });
  }
}


import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  private ticketInclude = {
    orderItem: {
      include: {
        order: {
          include: {
            event: true,
            customerUser: true,
            transferRequests: {
              orderBy: {
                requestedAt: 'desc',
              },
            },
          },
        },
        ticketType: {
          include: {
            event: true,
          },
        },
      },
    },
    currentOwnerUser: true,
    checkins: {
      orderBy: {
        checkedAt: 'desc',
      },
    },
    transferRequests: {
      include: {
        requestedByUser: true,
        fromUser: true,
        toUser: true,
        order: {
          include: {
            event: true,
            customerUser: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    },
  } as const;

  private transferRequestInclude = {
    ticket: {
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                event: true,
                customerUser: true,
              },
            },
            ticketType: {
              include: {
                event: true,
              },
            },
          },
        },
        currentOwnerUser: true,
        checkins: {
          orderBy: {
            checkedAt: 'desc',
          },
        },
      },
    },
    order: {
      include: {
        event: true,
        customerUser: true,
      },
    },
    requestedByUser: true,
    fromUser: true,
    toUser: true,
  } as const;

  private normalizeCpf(value?: string | null) {
    return String(value || '').replace(/\D/g, '');
  }

  private normalizeEmail(value?: string | null) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized || null;
  }

  private async findUserByCpfOrEmail(params: {
    cpf?: string | null;
    email?: string | null;
  }) {
    const normalizedCpf = this.normalizeCpf(params.cpf);
    const normalizedEmail = this.normalizeEmail(params.email);

    if (normalizedCpf) {
      const userByCpf = await this.prisma.user.findUnique({
        where: {
          cpfNormalized: normalizedCpf,
        },
      });

      if (userByCpf) {
        return userByCpf;
      }
    }

    if (normalizedEmail) {
      const userByEmail = await this.prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (userByEmail) {
        return userByEmail;
      }
    }

    return null;
  }

  private async getTicketWithRelations(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: this.ticketInclude,
    });

    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado');
    }

    return ticket;
  }

  private async getTransferRequestWithRelations(transferRequestId: string) {
    const transferRequest = await this.prisma.ticketTransferRequest.findUnique({
      where: { id: transferRequestId },
      include: this.transferRequestInclude,
    });

    if (!transferRequest) {
      throw new NotFoundException('Solicitação de transferência não encontrada');
    }

    return transferRequest;
  }

  private async ensureNoActiveTransfer(ticketId: string, ignoreTransferId?: string) {
    const activeTransfer = await this.prisma.ticketTransferRequest.findFirst({
      where: {
        ticketId,
        status: {
          in: ['PENDING_PAYMENT', 'PENDING_ACCEPTANCE'],
        },
        ...(ignoreTransferId
          ? {
              id: {
                not: ignoreTransferId,
              },
            }
          : {}),
      },
    });

    if (activeTransfer) {
      throw new BadRequestException(
        'Este ingresso já possui uma transferência pendente',
      );
    }
  }

  async findAll() {
    return this.prisma.ticket.findMany({
      include: this.ticketInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    return this.getTicketWithRelations(id);
  }

  async findByCode(code: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { code },
      include: this.ticketInclude,
    });

    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado');
    }

    return ticket;
  }

  async findCustomerTickets(userId: string) {
    return this.prisma.ticket.findMany({
      where: {
        OR: [
          {
            currentOwnerUserId: userId,
          },
          {
            transferRequests: {
              some: {
                toUserId: userId,
                status: 'PENDING_ACCEPTANCE',
              },
            },
          },
        ],
      },
      include: this.ticketInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findIncomingTransferRequests(userId: string) {
    return this.prisma.ticketTransferRequest.findMany({
      where: {
        toUserId: userId,
        status: 'PENDING_ACCEPTANCE',
      },
      include: this.transferRequestInclude,
      orderBy: {
        requestedAt: 'desc',
      },
    });
  }

  async findOutgoingTransferRequests(userId: string) {
    return this.prisma.ticketTransferRequest.findMany({
      where: {
        OR: [
          {
            requestedByUserId: userId,
          },
          {
            fromUserId: userId,
          },
        ],
      },
      include: this.transferRequestInclude,
      orderBy: {
        requestedAt: 'desc',
      },
    });
  }

  async findTransferRequestById(transferRequestId: string, userId?: string) {
    const transferRequest = await this.getTransferRequestWithRelations(
      transferRequestId,
    );

    if (userId) {
      const canAccess =
        transferRequest.requestedByUserId === userId ||
        transferRequest.fromUserId === userId ||
        transferRequest.toUserId === userId ||
        transferRequest.order.customerUserId === userId ||
        transferRequest.ticket.currentOwnerUserId === userId;

      if (!canAccess) {
        throw new ForbiddenException(
          'Você não tem permissão para visualizar esta transferência',
        );
      }
    }

    return transferRequest;
  }

  async createTransferRequest(
    ticketId: string,
    userId: string,
    body: {
      targetCpf?: string;
      targetEmail?: string;
    },
  ) {
    const normalizedCpf = this.normalizeCpf(body?.targetCpf);
    const normalizedEmail = this.normalizeEmail(body?.targetEmail);

    if (!normalizedCpf && !normalizedEmail) {
      throw new BadRequestException('Informe o CPF do destinatário');
    }

    const ticket = await this.getTicketWithRelations(ticketId);

    if (!ticket.currentOwnerUserId || ticket.currentOwnerUserId !== userId) {
      throw new ForbiddenException(
        'Somente o dono atual do ingresso pode transferi-lo',
      );
    }

    if (ticket.status === 'CANCELED') {
      throw new BadRequestException(
        'Não é possível transferir um ingresso cancelado',
      );
    }

    if (ticket.status === 'USED') {
      throw new BadRequestException(
        'Não é possível transferir um ingresso já utilizado',
      );
    }

    if (ticket.status === 'TRANSFER_PENDING') {
      throw new BadRequestException(
        'Este ingresso já está com transferência pendente',
      );
    }

    if (ticket.status !== 'AVAILABLE') {
      throw new BadRequestException(
        'Somente ingressos disponíveis podem ser transferidos',
      );
    }

    await this.ensureNoActiveTransfer(ticket.id);

    const currentOwner = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!currentOwner) {
      throw new NotFoundException('Usuário remetente não encontrado');
    }

    const targetUser = await this.findUserByCpfOrEmail({
      cpf: normalizedCpf,
      email: normalizedEmail,
    });

    if (!targetUser) {
      throw new BadRequestException(
        'O destinatário precisa possuir conta cadastrada',
      );
    }

    if (targetUser.id === currentOwner.id) {
      throw new BadRequestException(
        'Você não pode transferir o ingresso para a sua própria conta',
      );
    }

    const transferRequest = await this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'TRANSFER_PENDING',
        },
      });

      return tx.ticketTransferRequest.create({
        data: {
          ticketId: ticket.id,
          orderId: ticket.orderItem.order.id,
          requestedByUserId: currentOwner.id,
          fromUserId: currentOwner.id,
          toUserId: targetUser.id,
          requestedByName: currentOwner.name || null,
          requestedByEmail: currentOwner.email || null,
          requestedByCpf: currentOwner.cpfNormalized || null,
          fromName: currentOwner.name || null,
          fromEmail: currentOwner.email || null,
          fromCpf: currentOwner.cpfNormalized || null,
          toName: targetUser.name || null,
          toEmail: targetUser.email || null,
          toCpf: targetUser.cpfNormalized || null,
          status: 'PENDING_ACCEPTANCE',
        },
      });
    });

    return this.findTransferRequestById(transferRequest.id, userId);
  }

  async acceptTransferRequest(transferRequestId: string, userId: string) {
    const transferRequest = await this.getTransferRequestWithRelations(
      transferRequestId,
    );

    if (transferRequest.toUserId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para aceitar esta transferência',
      );
    }

    if (transferRequest.status !== 'PENDING_ACCEPTANCE') {
      throw new BadRequestException(
        'Esta transferência não está aguardando aceite',
      );
    }

    if (transferRequest.ticket.status === 'CANCELED') {
      throw new BadRequestException(
        'Não é possível aceitar transferência de ingresso cancelado',
      );
    }

    if (transferRequest.ticket.status === 'USED') {
      throw new BadRequestException(
        'Não é possível aceitar transferência de ingresso já utilizado',
      );
    }

    await this.ensureNoActiveTransfer(transferRequest.ticketId, transferRequest.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: transferRequest.ticketId },
        data: {
          currentOwnerUserId: transferRequest.toUserId,
          holderName:
            transferRequest.toName ||
            transferRequest.toUser?.name ||
            transferRequest.ticket.holderName ||
            null,
          holderEmail:
            transferRequest.toEmail ||
            transferRequest.toUser?.email ||
            transferRequest.ticket.holderEmail ||
            null,
          holderCpf:
            transferRequest.toCpf ||
            transferRequest.toUser?.cpfNormalized ||
            transferRequest.ticket.holderCpf ||
            null,
          status: 'AVAILABLE',
        },
      });

      await tx.ticketTransferRequest.update({
        where: { id: transferRequest.id },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
          responseReason: null,
        },
      });

      await tx.ticketTransferRequest.updateMany({
        where: {
          ticketId: transferRequest.ticketId,
          id: {
            not: transferRequest.id,
          },
          status: {
            in: ['PENDING_PAYMENT', 'PENDING_ACCEPTANCE'],
          },
        },
        data: {
          status: 'CANCELED',
          respondedAt: new Date(),
          responseReason: 'Transferência concluída por outra solicitação',
        },
      });
    });

    return this.findTransferRequestById(transferRequestId, userId);
  }

  async rejectTransferRequest(
    transferRequestId: string,
    userId: string,
    reason?: string,
  ) {
    const transferRequest = await this.getTransferRequestWithRelations(
      transferRequestId,
    );

    if (transferRequest.toUserId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para recusar esta transferência',
      );
    }

    if (transferRequest.status !== 'PENDING_ACCEPTANCE') {
      throw new BadRequestException(
        'Esta transferência não está aguardando resposta',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: transferRequest.ticketId },
        data: {
          currentOwnerUserId: transferRequest.fromUserId,
          holderName:
            transferRequest.fromName ||
            transferRequest.fromUser?.name ||
            transferRequest.ticket.holderName ||
            null,
          holderEmail:
            transferRequest.fromEmail ||
            transferRequest.fromUser?.email ||
            transferRequest.ticket.holderEmail ||
            null,
          holderCpf:
            transferRequest.fromCpf ||
            transferRequest.fromUser?.cpfNormalized ||
            transferRequest.ticket.holderCpf ||
            null,
          status: 'AVAILABLE',
        },
      });

      await tx.ticketTransferRequest.update({
        where: { id: transferRequest.id },
        data: {
          status: 'REJECTED',
          respondedAt: new Date(),
          responseReason: reason?.trim() || 'Transferência recusada',
        },
      });
    });

    return this.findTransferRequestById(transferRequestId, userId);
  }

  async cancelTransferRequest(transferRequestId: string, userId: string) {
    const transferRequest = await this.getTransferRequestWithRelations(
      transferRequestId,
    );

    const canCancel =
      transferRequest.requestedByUserId === userId ||
      transferRequest.fromUserId === userId;

    if (!canCancel) {
      throw new ForbiddenException(
        'Você não tem permissão para cancelar esta transferência',
      );
    }

    if (
      transferRequest.status !== 'PENDING_PAYMENT' &&
      transferRequest.status !== 'PENDING_ACCEPTANCE'
    ) {
      throw new BadRequestException(
        'Esta transferência não pode mais ser cancelada',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: transferRequest.ticketId },
        data: {
          currentOwnerUserId: transferRequest.fromUserId,
          holderName:
            transferRequest.fromName ||
            transferRequest.fromUser?.name ||
            transferRequest.ticket.holderName ||
            null,
          holderEmail:
            transferRequest.fromEmail ||
            transferRequest.fromUser?.email ||
            transferRequest.ticket.holderEmail ||
            null,
          holderCpf:
            transferRequest.fromCpf ||
            transferRequest.fromUser?.cpfNormalized ||
            transferRequest.ticket.holderCpf ||
            null,
          status: 'AVAILABLE',
        },
      });

      await tx.ticketTransferRequest.update({
        where: { id: transferRequest.id },
        data: {
          status: 'CANCELED',
          respondedAt: new Date(),
          responseReason: 'Transferência cancelada pelo solicitante',
        },
      });
    });

    return this.findTransferRequestById(transferRequestId, userId);
  }
}
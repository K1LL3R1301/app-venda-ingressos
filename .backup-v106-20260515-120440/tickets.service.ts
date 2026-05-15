import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DbClient = Prisma.TransactionClient | PrismaService;

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

  private getTransferAcceptanceExpiresAt() {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  private isExpiredTransfer(transferRequest: {
    status?: string | null;
    expiresAt?: Date | string | null;
  }) {
    if (transferRequest.status !== 'PENDING_ACCEPTANCE') return false;
    if (!transferRequest.expiresAt) return false;

    const expiresAt = new Date(transferRequest.expiresAt).getTime();
    if (Number.isNaN(expiresAt)) return false;

    return expiresAt < Date.now();
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

  private async getEventCpfLimit(eventId: string, db: DbClient = this.prisma) {
    const ticketTypes = await db.ticketType.findMany({
      where: { eventId },
      select: { maxPerOrder: true },
    });

    const configuredLimits = ticketTypes
      .map((ticketType) => Number(ticketType.maxPerOrder || 0))
      .filter((limit) => Number.isFinite(limit) && limit > 0);

    if (configuredLimits.length === 0) {
      return 4;
    }

    return Math.max(1, Math.min(...configuredLimits));
  }

  private async countTicketsByCpfForEvent(
    eventId: string,
    cpf: string,
    db: DbClient = this.prisma,
  ) {
    const normalizedCpf = this.normalizeCpf(cpf);

    if (!normalizedCpf) {
      return 0;
    }

    return db.ticket.count({
      where: {
        holderCpf: normalizedCpf,
        status: {
          not: 'CANCELED',
        },
        orderItem: {
          ticketType: {
            eventId,
          },
        },
      },
    });
  }

  private async ensureCpfCanReceiveTicket(params: {
    eventId: string;
    cpf: string;
    quantity?: number;
    db?: DbClient;
  }) {
    const db = params.db || this.prisma;
    const normalizedCpf = this.normalizeCpf(params.cpf);
    const quantity = Math.max(1, Number(params.quantity || 1));

    if (!normalizedCpf) {
      throw new BadRequestException('CPF do destinatario e obrigatorio');
    }

    const limit = await this.getEventCpfLimit(params.eventId, db);
    const currentQuantity = await this.countTicketsByCpfForEvent(
      params.eventId,
      normalizedCpf,
      db,
    );

    if (currentQuantity + quantity > limit) {
      throw new BadRequestException(
        `O CPF ${normalizedCpf} ja possui ${currentQuantity} ingresso(s) neste evento. O limite definido pelo produtor e ${limit} ingresso(s) por CPF no evento inteiro.`,
      );
    }
  }

  private async getTicketWithRelations(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: this.ticketInclude,
    });

    if (!ticket) {
      throw new NotFoundException('Ingresso nao encontrado');
    }

    return ticket;
  }

  private async getTransferRequestWithRelations(transferRequestId: string) {
    const transferRequest = await this.prisma.ticketTransferRequest.findUnique({
      where: { id: transferRequestId },
      include: this.transferRequestInclude,
    });

    if (!transferRequest) {
      throw new NotFoundException('Solicitacao de transferencia nao encontrada');
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
        'Este ingresso ja possui uma transferencia pendente',
      );
    }
  }

  private async restoreTicketFromTransfer(
    tx: Prisma.TransactionClient,
    transferRequest: Awaited<ReturnType<TicketsService['getTransferRequestWithRelations']>>,
  ) {
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
        receivedViaTransferRequestId: null,
        receivedViaTransferLocked: false,
      },
    });
  }

  private async expireTransferIfNeeded(
    transferRequest: Awaited<ReturnType<TicketsService['getTransferRequestWithRelations']>>,
  ) {
    if (!this.isExpiredTransfer(transferRequest)) {
      return transferRequest;
    }

    await this.prisma.$transaction(async (tx) => {
      await this.restoreTicketFromTransfer(tx, transferRequest);

      await tx.ticketTransferRequest.update({
        where: { id: transferRequest.id },
        data: {
          status: 'CANCELED',
          respondedAt: new Date(),
          responseReason: 'Prazo de aceite expirado automaticamente',
        },
      });
    });

    return this.getTransferRequestWithRelations(transferRequest.id);
  }

  private async expirePendingTransfersForUser(userId: string) {
    const expiredTransfers = await this.prisma.ticketTransferRequest.findMany({
      where: {
        status: 'PENDING_ACCEPTANCE',
        expiresAt: {
          lt: new Date(),
        },
        OR: [
          { toUserId: userId },
          { fromUserId: userId },
          { requestedByUserId: userId },
        ],
      },
      include: this.transferRequestInclude,
    });

    for (const transferRequest of expiredTransfers) {
      await this.expireTransferIfNeeded(transferRequest);
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
      throw new NotFoundException('Ingresso nao encontrado');
    }

    return ticket;
  }

  async findCustomerTickets(userId: string) {
    await this.expirePendingTransfersForUser(userId);

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
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
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
    await this.expirePendingTransfersForUser(userId);

    return this.prisma.ticketTransferRequest.findMany({
      where: {
        toUserId: userId,
        status: 'PENDING_ACCEPTANCE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: this.transferRequestInclude,
      orderBy: {
        requestedAt: 'desc',
      },
    });
  }

  async findOutgoingTransferRequests(userId: string) {
    await this.expirePendingTransfersForUser(userId);

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
    let transferRequest = await this.getTransferRequestWithRelations(
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
          'Voce nao tem permissao para visualizar esta transferencia',
        );
      }
    }

    transferRequest = await this.expireTransferIfNeeded(transferRequest);
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
    const ticket = await this.getTicketWithRelations(ticketId);

    if (!ticket.currentOwnerUserId || ticket.currentOwnerUserId !== userId) {
      throw new ForbiddenException(
        'Somente o dono atual do ingresso pode transferi-lo',
      );
    }

    if (ticket.status === 'CANCELED') {
      throw new BadRequestException(
        'Nao e possivel transferir um ingresso cancelado',
      );
    }

    if (ticket.status === 'USED') {
      throw new BadRequestException(
        'Nao e possivel transferir um ingresso ja utilizado',
      );
    }

    if (ticket.status === 'TRANSFER_PENDING') {
      throw new BadRequestException(
        'Este ingresso ja esta com transferencia pendente',
      );
    }

    if (ticket.status !== 'AVAILABLE') {
      throw new BadRequestException(
        'Somente ingressos disponiveis podem ser transferidos',
      );
    }

    await this.ensureNoActiveTransfer(ticket.id);

    const currentOwner = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!currentOwner) {
      throw new NotFoundException('Usuario remetente nao encontrado');
    }

    if (!normalizedCpf && !normalizedEmail) {
      throw new BadRequestException('Informe o CPF do destinatario');
    }

    const targetUser = await this.findUserByCpfOrEmail({
      cpf: normalizedCpf,
      email: normalizedEmail,
    });

    if (!targetUser) {
      throw new BadRequestException(
        'O destinatario precisa possuir conta cadastrada',
      );
    }

    if (targetUser.id === currentOwner.id) {
      throw new BadRequestException(
        'Voce nao pode transferir o ingresso para a sua propria conta',
      );
    }

    const eventId = ticket.orderItem.ticketType.eventId;

    await this.ensureCpfCanReceiveTicket({
      eventId,
      cpf: targetUser.cpfNormalized || normalizedCpf,
      quantity: 1,
    });

    const transferExpiresAt = this.getTransferAcceptanceExpiresAt();

    const transferRequest = await this.prisma.$transaction(async (tx) => {
      await this.ensureCpfCanReceiveTicket({
        eventId,
        cpf: targetUser.cpfNormalized || normalizedCpf,
        quantity: 1,
        db: tx,
      });

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
          mode: 'FORWARD',
          returnOfTransferRequestId: null,
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
          expiresAt: transferExpiresAt,
        },
      });
    });

    return this.findTransferRequestById(transferRequest.id, userId);
  }

  async acceptTransferRequest(transferRequestId: string, userId: string) {
    let transferRequest = await this.getTransferRequestWithRelations(
      transferRequestId,
    );

    if (transferRequest.toUserId !== userId) {
      throw new ForbiddenException(
        'Voce nao tem permissao para aceitar esta transferencia',
      );
    }

    transferRequest = await this.expireTransferIfNeeded(transferRequest);

    if (transferRequest.status !== 'PENDING_ACCEPTANCE') {
      throw new BadRequestException(
        'Esta transferencia nao esta aguardando aceite',
      );
    }

    if (transferRequest.ticket.status === 'CANCELED') {
      throw new BadRequestException(
        'Nao e possivel aceitar transferencia de ingresso cancelado',
      );
    }

    if (transferRequest.ticket.status === 'USED') {
      throw new BadRequestException(
        'Nao e possivel aceitar transferencia de ingresso ja utilizado',
      );
    }

    await this.ensureNoActiveTransfer(transferRequest.ticketId, transferRequest.id);

    const eventId = transferRequest.ticket.orderItem.ticketType.eventId;
    const targetCpf =
      transferRequest.toCpf || transferRequest.toUser?.cpfNormalized || '';

    await this.ensureCpfCanReceiveTicket({
      eventId,
      cpf: targetCpf,
      quantity: 1,
    });

    await this.prisma.$transaction(async (tx) => {
      await this.ensureCpfCanReceiveTicket({
        eventId,
        cpf: targetCpf,
        quantity: 1,
        db: tx,
      });

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
          receivedViaTransferRequestId: transferRequest.id,
          receivedViaTransferLocked: true,
        },
      });

      await tx.ticketTransferRequest.update({
        where: { id: transferRequest.id },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
          expiresAt: null,
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
          responseReason: 'Transferencia concluida por outra solicitacao',
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
    let transferRequest = await this.getTransferRequestWithRelations(
      transferRequestId,
    );

    if (transferRequest.toUserId !== userId) {
      throw new ForbiddenException(
        'Voce nao tem permissao para recusar esta transferencia',
      );
    }

    transferRequest = await this.expireTransferIfNeeded(transferRequest);

    if (transferRequest.status !== 'PENDING_ACCEPTANCE') {
      throw new BadRequestException(
        'Esta transferencia nao esta aguardando resposta',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await this.restoreTicketFromTransfer(tx, transferRequest);

      await tx.ticketTransferRequest.update({
        where: { id: transferRequest.id },
        data: {
          status: 'REJECTED',
          respondedAt: new Date(),
          expiresAt: null,
          responseReason: reason?.trim() || 'Transferencia recusada',
        },
      });
    });

    return this.findTransferRequestById(transferRequestId, userId);
  }

  async cancelTransferRequest(transferRequestId: string, userId: string) {
    let transferRequest = await this.getTransferRequestWithRelations(
      transferRequestId,
    );

    const canCancel =
      transferRequest.requestedByUserId === userId ||
      transferRequest.fromUserId === userId;

    if (!canCancel) {
      throw new ForbiddenException(
        'Voce nao tem permissao para cancelar esta transferencia',
      );
    }

    transferRequest = await this.expireTransferIfNeeded(transferRequest);

    if (
      transferRequest.status !== 'PENDING_PAYMENT' &&
      transferRequest.status !== 'PENDING_ACCEPTANCE'
    ) {
      throw new BadRequestException(
        'Esta transferencia nao pode mais ser cancelada',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await this.restoreTicketFromTransfer(tx, transferRequest);

      await tx.ticketTransferRequest.update({
        where: { id: transferRequest.id },
        data: {
          status: 'CANCELED',
          respondedAt: new Date(),
          expiresAt: null,
          responseReason: 'Transferencia cancelada pelo solicitante',
        },
      });
    });

    return this.findTransferRequestById(transferRequestId, userId);
  }
}

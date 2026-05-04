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

  private getTransferMode(mode?: string | null) {
    return mode === 'RETURN' ? 'RETURN' : 'FORWARD';
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

  private async getOriginTransferForLockedTicket(ticket: {
    receivedViaTransferLocked?: boolean | null;
    receivedViaTransferRequestId?: string | null;
  }) {
    if (!ticket.receivedViaTransferLocked) {
      return null;
    }

    if (!ticket.receivedViaTransferRequestId) {
      throw new BadRequestException(
        'Este ingresso está travado para devolução, mas não possui vínculo de transferência de origem',
      );
    }

    const originTransfer = await this.prisma.ticketTransferRequest.findUnique({
      where: { id: ticket.receivedViaTransferRequestId },
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
        ticket: true,
      },
    });

    if (!originTransfer) {
      throw new NotFoundException(
        'Transferência de origem não encontrada para este ingresso',
      );
    }

    return originTransfer;
  }

  private buildLockedReturnFallbackData(originTransfer: {
    id: string;
    fromName?: string | null;
    fromEmail?: string | null;
    fromCpf?: string | null;
    fromUser?: {
      name?: string | null;
      email?: string | null;
      cpfNormalized?: string | null;
    } | null;
    ticket: {
      holderName?: string | null;
      holderEmail?: string | null;
      holderCpf?: string | null;
    };
  }) {
    return {
      holderName:
        originTransfer.fromName ||
        originTransfer.fromUser?.name ||
        originTransfer.ticket.holderName ||
        null,
      holderEmail:
        originTransfer.fromEmail ||
        originTransfer.fromUser?.email ||
        originTransfer.ticket.holderEmail ||
        null,
      holderCpf:
        originTransfer.fromCpf ||
        originTransfer.fromUser?.cpfNormalized ||
        originTransfer.ticket.holderCpf ||
        null,
      receivedViaTransferRequestId: originTransfer.id,
      receivedViaTransferLocked: true,
    };
  }

  private async restoreTicketFromTransfer(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    transferRequest: Awaited<ReturnType<TicketsService['getTransferRequestWithRelations']>>,
  ) {
    const transferMode = this.getTransferMode(transferRequest.mode);

    const lockedReturnData =
      transferMode === 'RETURN' && transferRequest.returnOfTransferRequestId
        ? this.buildLockedReturnFallbackData({
            id: transferRequest.returnOfTransferRequestId,
            fromName: transferRequest.fromName,
            fromEmail: transferRequest.fromEmail,
            fromCpf: transferRequest.fromCpf,
            fromUser: transferRequest.fromUser,
            ticket: transferRequest.ticket,
          })
        : null;

    await tx.ticket.update({
      where: { id: transferRequest.ticketId },
      data: {
        currentOwnerUserId: transferRequest.fromUserId,
        holderName:
          transferMode === 'RETURN'
            ? lockedReturnData?.holderName || null
            : transferRequest.fromName ||
              transferRequest.fromUser?.name ||
              transferRequest.ticket.holderName ||
              null,
        holderEmail:
          transferMode === 'RETURN'
            ? lockedReturnData?.holderEmail || null
            : transferRequest.fromEmail ||
              transferRequest.fromUser?.email ||
              transferRequest.ticket.holderEmail ||
              null,
        holderCpf:
          transferMode === 'RETURN'
            ? lockedReturnData?.holderCpf || null
            : transferRequest.fromCpf ||
              transferRequest.fromUser?.cpfNormalized ||
              transferRequest.ticket.holderCpf ||
              null,
        status: 'AVAILABLE',
        receivedViaTransferRequestId:
          transferMode === 'RETURN'
            ? lockedReturnData?.receivedViaTransferRequestId || null
            : null,
        receivedViaTransferLocked:
          transferMode === 'RETURN'
            ? lockedReturnData?.receivedViaTransferLocked || false
            : false,
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
      throw new NotFoundException('Ingresso não encontrado');
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
          'Você não tem permissão para visualizar esta transferência',
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

    const originTransfer = await this.getOriginTransferForLockedTicket(ticket);
    const isReturnOnlyTicket = !!originTransfer;

    if (isReturnOnlyTicket) {
      const originTargetCpf =
        originTransfer.fromUser?.cpfNormalized ||
        this.normalizeCpf(originTransfer.fromCpf);
      const originTargetEmail =
        originTransfer.fromUser?.email ||
        this.normalizeEmail(originTransfer.fromEmail);

      if (
        normalizedCpf &&
        originTargetCpf &&
        normalizedCpf !== originTargetCpf
      ) {
        throw new BadRequestException(
          'Este ingresso só pode ser devolvido para quem enviou originalmente',
        );
      }

      if (
        normalizedEmail &&
        originTargetEmail &&
        normalizedEmail !== originTargetEmail
      ) {
        throw new BadRequestException(
          'Este ingresso só pode ser devolvido para quem enviou originalmente',
        );
      }

      const returnTransfer = await this.prisma.$transaction(async (tx) => {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            currentOwnerUserId: originTransfer.fromUserId,
            holderName:
              originTransfer.fromName ||
              originTransfer.fromUser?.name ||
              ticket.holderName ||
              null,
            holderEmail:
              originTransfer.fromEmail ||
              originTransfer.fromUser?.email ||
              ticket.holderEmail ||
              null,
            holderCpf:
              originTransfer.fromCpf ||
              originTransfer.fromUser?.cpfNormalized ||
              ticket.holderCpf ||
              null,
            status: 'AVAILABLE',
            receivedViaTransferRequestId: null,
            receivedViaTransferLocked: false,
          },
        });

        return tx.ticketTransferRequest.create({
          data: {
            ticketId: ticket.id,
            orderId: ticket.orderItem.order.id,
            requestedByUserId: currentOwner.id,
            fromUserId: currentOwner.id,
            toUserId: originTransfer.fromUserId,
            mode: 'RETURN',
            returnOfTransferRequestId: originTransfer.id,
            requestedByName: currentOwner.name || null,
            requestedByEmail: currentOwner.email || null,
            requestedByCpf: currentOwner.cpfNormalized || null,
            fromName: currentOwner.name || null,
            fromEmail: currentOwner.email || null,
            fromCpf: currentOwner.cpfNormalized || null,
            toName:
              originTransfer.fromName ||
              originTransfer.fromUser?.name ||
              null,
            toEmail:
              originTransfer.fromEmail ||
              originTransfer.fromUser?.email ||
              null,
            toCpf:
              originTransfer.fromCpf ||
              originTransfer.fromUser?.cpfNormalized ||
              null,
            status: 'RETURNED',
            requestedAt: new Date(),
            respondedAt: new Date(),
            expiresAt: null,
            responseReason:
              'Ingresso devolvido automaticamente ao remetente original',
          },
        });
      });

      return this.findTransferRequestById(returnTransfer.id, userId);
    }

    if (!normalizedCpf && !normalizedEmail) {
      throw new BadRequestException('Informe o CPF do destinatário');
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

    const transferExpiresAt = this.getTransferAcceptanceExpiresAt();

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
        'Você não tem permissão para aceitar esta transferência',
      );
    }

    transferRequest = await this.expireTransferIfNeeded(transferRequest);

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

    const transferMode = this.getTransferMode(transferRequest.mode);

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
          receivedViaTransferRequestId:
            transferMode === 'RETURN' ? null : transferRequest.id,
          receivedViaTransferLocked: transferMode === 'RETURN' ? false : true,
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
    let transferRequest = await this.getTransferRequestWithRelations(
      transferRequestId,
    );

    if (transferRequest.toUserId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para recusar esta transferência',
      );
    }

    transferRequest = await this.expireTransferIfNeeded(transferRequest);

    if (transferRequest.status !== 'PENDING_ACCEPTANCE') {
      throw new BadRequestException(
        'Esta transferência não está aguardando resposta',
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
          responseReason: reason?.trim() || 'Transferência recusada',
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
        'Você não tem permissão para cancelar esta transferência',
      );
    }

    transferRequest = await this.expireTransferIfNeeded(transferRequest);

    if (
      transferRequest.status !== 'PENDING_PAYMENT' &&
      transferRequest.status !== 'PENDING_ACCEPTANCE'
    ) {
      throw new BadRequestException(
        'Esta transferência não pode mais ser cancelada',
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
          responseReason: 'Transferência cancelada pelo solicitante',
        },
      });
    });

    return this.findTransferRequestById(transferRequestId, userId);
  }
}
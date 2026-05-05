import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type TicketQrPayload = {
  v: '1';
  ticketId: string;
  code: string;
  orderId: string;
  eventId: string;
  ownerUserId: string | null;
  ticketUpdatedAt: string;
  iat: number;
  exp: number;
};

type GenerateTicketQrTokenParams = {
  ticketId: string;
  userId: string;
  userRole?: string;
};

type ValidateTicketQrTokenParams = {
  token?: string;
  gate?: string;
  operatorName?: string;
  markAsUsed?: boolean;
};

@Injectable()
export class TicketsQrService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly tokenPrefix = 'tkt_v1';

  private getSecret() {
    return (
      process.env.TICKET_QR_SECRET ||
      process.env.JWT_SECRET ||
      'local-dev-ticket-qr-secret-change-me'
    );
  }

  private getTokenExpirationDate() {
    return new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  }

  private getTicketInclude() {
    return {
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
          checkedAt: 'desc' as const,
        },
      },
    };
  }

  private sign(encodedPayload: string) {
    return createHmac('sha256', this.getSecret())
      .update(encodedPayload)
      .digest('base64url');
  }

  private safeCompare(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);

    if (left.length !== right.length) return false;

    return timingSafeEqual(left, right);
  }

  private encodePayload(payload: TicketQrPayload) {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private decodeToken(token?: string): {
    payload: TicketQrPayload | null;
    reason: string | null;
  } {
    if (!token) {
      return {
        payload: null,
        reason: 'Token não informado',
      };
    }

    const parts = token.split('.');

    if (parts.length !== 3 || parts[0] !== this.tokenPrefix) {
      return {
        payload: null,
        reason: 'Formato do QR Code inválido',
      };
    }

    const [, encodedPayload, signature] = parts;
    const expectedSignature = this.sign(encodedPayload);

    if (!this.safeCompare(signature, expectedSignature)) {
      return {
        payload: null,
        reason: 'Assinatura do QR Code inválida',
      };
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf-8'),
      ) as TicketQrPayload;

      if (payload.v !== '1') {
        return {
          payload: null,
          reason: 'Versão do QR Code inválida',
        };
      }

      if (!payload.ticketId || !payload.code || !payload.orderId) {
        return {
          payload: null,
          reason: 'QR Code incompleto',
        };
      }

      if (payload.exp < Date.now()) {
        return {
          payload: null,
          reason: 'QR Code expirado',
        };
      }

      return {
        payload,
        reason: null,
      };
    } catch {
      return {
        payload: null,
        reason: 'QR Code ilegível',
      };
    }
  }

  private async getTicket(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      include: this.getTicketInclude(),
    });

    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado');
    }

    return ticket;
  }

  private canManageQr(params: {
    userId: string;
    userRole?: string;
    ticket: Awaited<ReturnType<TicketsQrService['getTicket']>>;
  }) {
    const role = String(params.userRole || '').toUpperCase();

    if (role === 'ADMIN' || role === 'OPERATOR') {
      return true;
    }

    const orderCustomerUserId = params.ticket.orderItem.order.customerUserId;
    const currentOwnerUserId = params.ticket.currentOwnerUserId;

    return (
      currentOwnerUserId === params.userId || orderCustomerUserId === params.userId
    );
  }

  async generateTicketQrToken(params: GenerateTicketQrTokenParams) {
    const ticket = await this.getTicket(params.ticketId);

    if (
      !this.canManageQr({
        userId: params.userId,
        userRole: params.userRole,
        ticket,
      })
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para gerar o QR Code deste ingresso',
      );
    }

    if (ticket.orderItem.order.status !== 'PAID') {
      throw new BadRequestException(
        'O QR Code só fica disponível após o pagamento do pedido',
      );
    }

    if (ticket.status !== 'AVAILABLE') {
      throw new BadRequestException(
        'O QR Code só pode ser gerado para ingressos disponíveis',
      );
    }

    const expiresAt = this.getTokenExpirationDate();

    const payload: TicketQrPayload = {
      v: '1',
      ticketId: ticket.id,
      code: ticket.code,
      orderId: ticket.orderItem.order.id,
      eventId: ticket.orderItem.order.event.id,
      ownerUserId: ticket.currentOwnerUserId || ticket.orderItem.order.customerUserId,
      ticketUpdatedAt: ticket.updatedAt.toISOString(),
      iat: Date.now(),
      exp: expiresAt.getTime(),
    };

    const encodedPayload = this.encodePayload(payload);
    const signature = this.sign(encodedPayload);
    const token = `${this.tokenPrefix}.${encodedPayload}.${signature}`;

    return {
      token,
      expiresAt,
      ticketId: ticket.id,
      code: ticket.code,
      status: ticket.status,
      event: {
        id: ticket.orderItem.order.event.id,
        name: ticket.orderItem.order.event.name,
        startDate: ticket.orderItem.order.event.startDate,
        eventDate: ticket.orderItem.order.event.eventDate,
      },
      ticketType: {
        id: ticket.orderItem.ticketType.id,
        name: ticket.orderItem.ticketType.name,
      },
      holder: {
        name: ticket.holderName,
        cpf: ticket.holderCpf,
      },
    };
  }

  async validateTicketQrToken(params: ValidateTicketQrTokenParams) {
    const decoded = this.decodeToken(params.token);

    if (!decoded.payload) {
      return {
        valid: false,
        reason: decoded.reason || 'QR Code inválido',
      };
    }

    const payload = decoded.payload;

    const ticket = await this.prisma.ticket.findUnique({
      where: {
        id: payload.ticketId,
      },
      include: this.getTicketInclude(),
    });

    if (!ticket) {
      return {
        valid: false,
        reason: 'Ingresso não encontrado',
      };
    }

    const order = ticket.orderItem.order;
    const event = order.event;
    const currentOwnerUserId = ticket.currentOwnerUserId || order.customerUserId;

    if (ticket.code !== payload.code) {
      return {
        valid: false,
        reason: 'Código do ingresso não confere',
      };
    }

    if (order.id !== payload.orderId) {
      return {
        valid: false,
        reason: 'Pedido do QR Code não confere',
      };
    }

    if (event.id !== payload.eventId) {
      return {
        valid: false,
        reason: 'Evento do QR Code não confere',
      };
    }

    if (currentOwnerUserId !== payload.ownerUserId) {
      return {
        valid: false,
        reason: 'Titular do ingresso mudou após a emissão deste QR Code',
      };
    }

    if (ticket.updatedAt.toISOString() !== payload.ticketUpdatedAt) {
      return {
        valid: false,
        reason:
          'Ingresso foi alterado depois da emissão deste QR Code. Gere um novo QR Code.',
      };
    }

    if (order.status !== 'PAID') {
      return {
        valid: false,
        reason: 'Pedido ainda não está pago',
      };
    }

    if (ticket.status === 'USED') {
      return {
        valid: false,
        reason: 'Ingresso já utilizado',
        ticket: {
          id: ticket.id,
          code: ticket.code,
          status: ticket.status,
          usedAt: ticket.usedAt,
          lastCheckin: ticket.checkins[0] || null,
        },
        event: {
          id: event.id,
          name: event.name,
        },
      };
    }

    if (ticket.status !== 'AVAILABLE') {
      return {
        valid: false,
        reason: `Ingresso não está disponível. Status atual: ${ticket.status}`,
        ticket: {
          id: ticket.id,
          code: ticket.code,
          status: ticket.status,
        },
        event: {
          id: event.id,
          name: event.name,
        },
      };
    }

    if (!params.markAsUsed) {
      return {
        valid: true,
        reason: 'Ingresso válido',
        ticket: {
          id: ticket.id,
          code: ticket.code,
          status: ticket.status,
          holderName: ticket.holderName,
          holderCpf: ticket.holderCpf,
        },
        order: {
          id: order.id,
          status: order.status,
        },
        event: {
          id: event.id,
          name: event.name,
          startDate: event.startDate,
          eventDate: event.eventDate,
        },
        ticketType: {
          id: ticket.orderItem.ticketType.id,
          name: ticket.orderItem.ticketType.name,
        },
      };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          status: 'AVAILABLE',
        },
        data: {
          status: 'USED',
          usedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        return {
          valid: false,
          reason: 'Ingresso já foi utilizado ou não está mais disponível',
        };
      }

      const checkin = await tx.checkin.create({
        data: {
          ticketId: ticket.id,
          gate: params.gate?.trim() || 'Entrada principal',
          operatorName: params.operatorName?.trim() || 'Operador',
        },
      });

      const updatedTicket = await tx.ticket.findUnique({
        where: {
          id: ticket.id,
        },
        include: {
          checkins: {
            orderBy: {
              checkedAt: 'desc',
            },
          },
        },
      });

      return {
        valid: true,
        reason: 'Entrada validada com sucesso',
        ticket: {
          id: ticket.id,
          code: ticket.code,
          status: updatedTicket?.status || 'USED',
          holderName: ticket.holderName,
          holderCpf: ticket.holderCpf,
          usedAt: updatedTicket?.usedAt || new Date(),
        },
        checkin,
        order: {
          id: order.id,
          status: order.status,
        },
        event: {
          id: event.id,
          name: event.name,
          startDate: event.startDate,
          eventDate: event.eventDate,
        },
        ticketType: {
          id: ticket.orderItem.ticketType.id,
          name: ticket.orderItem.ticketType.name,
        },
      };
    });

    return result;
  }
}
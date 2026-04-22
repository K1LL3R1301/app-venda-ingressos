import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CancelTicketDto } from './dto/cancel-ticket.dto';
import { CreateOrderDto } from './dto/create-order.dto';

type BuiltTicketCreate = {
  code: string;
  currentOwnerUserId: string | null;
  holderName: string | null;
  holderEmail: string | null;
  holderCpf: string | null;
  transferPlan?: {
    requestedByUserId: string;
    fromUserId: string;
    toUserId: string;
    requestedByName: string | null;
    requestedByEmail: string | null;
    requestedByCpf: string | null;
    fromName: string | null;
    fromEmail: string | null;
    fromCpf: string | null;
    toName: string | null;
    toEmail: string | null;
    toCpf: string | null;
  };
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private orderInclude = {
    event: true,
    items: {
      include: {
        ticketType: true,
        tickets: true,
      },
    },
    payments: true,
    cancellations: true,
    transferRequests: true,
  } as const;

  private normalizeCpf(value?: string | null) {
    return String(value || '').replace(/\D/g, '');
  }

  private normalizeEmail(value?: string | null) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized || null;
  }

  private getCancellationConfig(mode?: string) {
    const normalizedMode = mode === 'WALLET_80' ? 'WALLET_80' : 'REFUND_70';

    return {
      mode: normalizedMode,
      percent:
        normalizedMode === 'WALLET_80'
          ? new Prisma.Decimal('0.80')
          : new Prisma.Decimal('0.70'),
      createWalletCredit: normalizedMode === 'WALLET_80',
      cancellationStatus:
        normalizedMode === 'WALLET_80' ? 'CREDITED' : 'REFUND_REQUESTED',
    };
  }

  private async findUserByCpfOrEmail(
    params: {
      cpf?: string | null;
      email?: string | null;
    },
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<User | null> {
    const normalizedCpf = this.normalizeCpf(params.cpf);
    const normalizedEmail = this.normalizeEmail(params.email);

    if (normalizedCpf) {
      const userByCpf = await db.user.findUnique({
        where: { cpfNormalized: normalizedCpf },
      });

      if (userByCpf) {
        return userByCpf;
      }
    }

    if (normalizedEmail) {
      const userByEmail = await db.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (userByEmail) {
        return userByEmail;
      }
    }

    return null;
  }

  private async prepareOrderItems(data: CreateOrderDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: data.eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    let totalAmount = new Prisma.Decimal(0);

    const itemsData: {
      ticketTypeId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
    }[] = [];

    for (const item of data.items) {
      const ticketType = await this.prisma.ticketType.findUnique({
        where: { id: item.ticketTypeId },
      });

      if (!ticketType) {
        throw new NotFoundException(
          `Tipo de ingresso não encontrado: ${item.ticketTypeId}`,
        );
      }

      if (ticketType.eventId !== data.eventId) {
        throw new BadRequestException(
          `O ingresso ${ticketType.name} não pertence ao evento selecionado`,
        );
      }

      if (ticketType.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Tipo de ingresso inativo: ${ticketType.name}`,
        );
      }

      if (item.quantity > ticketType.quantity) {
        throw new BadRequestException(
          `Quantidade indisponível para ${ticketType.name}. Disponível: ${ticketType.quantity}`,
        );
      }

      if (item.holders?.length && item.holders.length !== item.quantity) {
        throw new BadRequestException(
          `O item ${ticketType.name} precisa ter exatamente ${item.quantity} titular(es) informado(s)`,
        );
      }

      const unitPrice = new Prisma.Decimal(ticketType.price);
      const totalPrice = unitPrice.mul(item.quantity);

      totalAmount = totalAmount.add(totalPrice);

      itemsData.push({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      });
    }

    return {
      event,
      itemsData,
      totalAmount,
    };
  }

  private async getWalletBalance(
    userId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const transactions = await db.walletTransaction.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    let balance = new Prisma.Decimal(0);

    for (const transaction of transactions) {
      if (transaction.type === 'DEBIT') {
        balance = balance.sub(transaction.amount);
      } else {
        balance = balance.add(transaction.amount);
      }
    }

    if (balance.lt(0)) {
      return new Prisma.Decimal(0);
    }

    return balance;
  }

  private async buildTicketCreates(
    data: CreateOrderDto,
    db: Prisma.TransactionClient | PrismaService,
    purchaserUserId?: string | null,
  ) {
    let purchaserUser: User | null = null;

    if (purchaserUserId) {
      purchaserUser = await db.user.findUnique({
        where: { id: purchaserUserId },
      });
    }

    if (!purchaserUser) {
      purchaserUser = await this.findUserByCpfOrEmail(
        {
          cpf: data.customerCpf,
          email: data.customerEmail,
        },
        db,
      );
    }

    const defaultHolderName = purchaserUser?.name || data.customerName;
    const defaultHolderEmail =
      purchaserUser?.email || this.normalizeEmail(data.customerEmail);
    const defaultHolderCpf =
      purchaserUser?.cpfNormalized || this.normalizeCpf(data.customerCpf);
    const defaultOwnerUserId = purchaserUser?.id || null;

    const ticketsByItem: BuiltTicketCreate[][] = [];

    for (const item of data.items) {
      const itemTickets: BuiltTicketCreate[] = [];

      for (let index = 0; index < item.quantity; index += 1) {
        const holder = item.holders?.[index];
        const holderName = String(holder?.name || '').trim() || null;
        const holderEmail = this.normalizeEmail(holder?.email);
        const holderCpf = this.normalizeCpf(holder?.cpf);

        let targetUser: User | null = null;

        if (holderCpf || holderEmail) {
          targetUser = await this.findUserByCpfOrEmail(
            {
              cpf: holderCpf,
              email: holderEmail,
            },
            db,
          );
        }

        if (holderCpf && !targetUser) {
          throw new BadRequestException(
            `O titular com CPF ${holderCpf} precisa possuir conta cadastrada para receber o ingresso`,
          );
        }

        const ticketCode = crypto.randomUUID();
        const isTransferToAnotherUser =
          !!targetUser &&
          !!defaultOwnerUserId &&
          targetUser.id !== defaultOwnerUserId;

        if (isTransferToAnotherUser && !purchaserUser) {
          throw new BadRequestException(
            'O comprador precisa possuir conta cadastrada para enviar ingresso para outra pessoa',
          );
        }

        itemTickets.push({
          code: ticketCode,
          currentOwnerUserId: defaultOwnerUserId,
          holderName:
            targetUser?.name ||
            holderName ||
            defaultHolderName ||
            null,
          holderEmail:
            targetUser?.email || holderEmail || defaultHolderEmail || null,
          holderCpf:
            targetUser?.cpfNormalized ||
            holderCpf ||
            defaultHolderCpf ||
            null,
          transferPlan:
            isTransferToAnotherUser && purchaserUser && targetUser
              ? {
                  requestedByUserId: purchaserUser.id,
                  fromUserId: purchaserUser.id,
                  toUserId: targetUser.id,
                  requestedByName: purchaserUser.name || null,
                  requestedByEmail: purchaserUser.email || null,
                  requestedByCpf: purchaserUser.cpfNormalized || null,
                  fromName: purchaserUser.name || null,
                  fromEmail: purchaserUser.email || null,
                  fromCpf: purchaserUser.cpfNormalized || null,
                  toName: targetUser.name || null,
                  toEmail: targetUser.email || null,
                  toCpf: targetUser.cpfNormalized || null,
                }
              : undefined,
        });
      }

      ticketsByItem.push(itemTickets);
    }

    return {
      purchaserUser,
      ticketsByItem,
    };
  }

  private async createTransferRequestsForOrder(
    orderId: string,
    ticketPlans: BuiltTicketCreate[][],
    db: Prisma.TransactionClient,
  ) {
    const tickets = ticketPlans.flat();
    const transferPlansByCode = new Map(
      tickets
        .filter((ticket) => ticket.transferPlan)
        .map((ticket) => [ticket.code, ticket.transferPlan!]),
    );

    if (transferPlansByCode.size === 0) {
      return;
    }

    const createdOrder = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            tickets: true,
          },
        },
      },
    });

    if (!createdOrder) {
      throw new NotFoundException('Pedido não encontrado após criação');
    }

    for (const item of createdOrder.items) {
      for (const ticket of item.tickets) {
        const transferPlan = transferPlansByCode.get(ticket.code);

        if (!transferPlan) {
          continue;
        }

        await db.ticketTransferRequest.create({
          data: {
            ticketId: ticket.id,
            orderId: createdOrder.id,
            requestedByUserId: transferPlan.requestedByUserId,
            fromUserId: transferPlan.fromUserId,
            toUserId: transferPlan.toUserId,
            requestedByName: transferPlan.requestedByName,
            requestedByEmail: transferPlan.requestedByEmail,
            requestedByCpf: transferPlan.requestedByCpf,
            fromName: transferPlan.fromName,
            fromEmail: transferPlan.fromEmail,
            fromCpf: transferPlan.fromCpf,
            toName: transferPlan.toName,
            toEmail: transferPlan.toEmail,
            toCpf: transferPlan.toCpf,
            status: 'PENDING_PAYMENT',
          },
        });
      }
    }
  }

  private async activateOrderTransferRequests(
    orderId: string,
    db: Prisma.TransactionClient,
  ) {
    const pendingTransfers = await db.ticketTransferRequest.findMany({
      where: {
        orderId,
        status: 'PENDING_PAYMENT',
      },
      select: {
        id: true,
        ticketId: true,
      },
    });

    if (pendingTransfers.length === 0) {
      return;
    }

    await db.ticketTransferRequest.updateMany({
      where: {
        id: {
          in: pendingTransfers.map((item) => item.id),
        },
      },
      data: {
        status: 'PENDING_ACCEPTANCE',
      },
    });

    await db.ticket.updateMany({
      where: {
        id: {
          in: pendingTransfers.map((item) => item.ticketId),
        },
      },
      data: {
        status: 'TRANSFER_PENDING',
      },
    });
  }

  async create(data: CreateOrderDto) {
    const normalizedCustomerEmail = this.normalizeEmail(data.customerEmail);

    if (!normalizedCustomerEmail) {
      throw new BadRequestException('Email do comprador é obrigatório');
    }

    const normalizedCustomerCpf = this.normalizeCpf(data.customerCpf);

    const mergedData: CreateOrderDto = {
      ...data,
      customerEmail: normalizedCustomerEmail,
      customerCpf: normalizedCustomerCpf || undefined,
    };

    const { itemsData, totalAmount } = await this.prepareOrderItems(mergedData);

    return this.prisma.$transaction(async (tx) => {
      const { purchaserUser, ticketsByItem } = await this.buildTicketCreates(
        mergedData,
        tx,
        null,
      );

      const order = await tx.order.create({
        data: {
          eventId: mergedData.eventId,
          customerUserId: purchaserUser?.id || null,
          customerName: mergedData.customerName,
          customerEmail: normalizedCustomerEmail,
          customerCpf:
            purchaserUser?.cpfNormalized || normalizedCustomerCpf || null,
          totalAmount,
          status: 'PENDING',
          items: {
            create: itemsData.map((item, index) => ({
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              tickets: {
                create: ticketsByItem[index].map((ticket) => ({
                  code: ticket.code,
                  currentOwnerUserId: ticket.currentOwnerUserId,
                  holderName: ticket.holderName,
                  holderEmail: ticket.holderEmail,
                  holderCpf: ticket.holderCpf,
                  status: 'AVAILABLE',
                })),
              },
            })),
          },
        },
        include: this.orderInclude,
      });

      for (const item of itemsData) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      await this.createTransferRequestsForOrder(order.id, ticketsByItem, tx);

      return tx.order.findUnique({
        where: { id: order.id },
        include: this.orderInclude,
      });
    });
  }

  async createCustomerOrder(
    userId: string,
    customerEmail: string,
    data: CreateOrderDto,
  ) {
    const normalizedCustomerEmail = this.normalizeEmail(customerEmail);

    if (!normalizedCustomerEmail) {
      throw new BadRequestException('Email do comprador é obrigatório');
    }

    const purchaserUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!purchaserUser) {
      throw new NotFoundException('Usuário comprador não encontrado');
    }

    const mergedData: CreateOrderDto = {
      ...data,
      customerEmail: normalizedCustomerEmail,
      customerCpf: purchaserUser.cpfNormalized || undefined,
    };

    const { itemsData, totalAmount } = await this.prepareOrderItems(mergedData);

    const walletBalance = mergedData.useWalletBalance
      ? await this.getWalletBalance(userId)
      : new Prisma.Decimal(0);

    const walletAppliedAmount = totalAmount.gt(walletBalance)
      ? walletBalance
      : totalAmount;

    const remainingAmount = totalAmount.sub(walletAppliedAmount);
    const orderStatus = remainingAmount.lte(0) ? 'PAID' : 'PENDING';

    return this.prisma.$transaction(async (tx) => {
      const { ticketsByItem } = await this.buildTicketCreates(
        mergedData,
        tx,
        userId,
      );

      const order = await tx.order.create({
        data: {
          eventId: mergedData.eventId,
          customerUserId: purchaserUser.id,
          customerName: mergedData.customerName,
          customerEmail: normalizedCustomerEmail,
          customerCpf: purchaserUser.cpfNormalized || null,
          totalAmount,
          status: orderStatus,
          items: {
            create: itemsData.map((item, index) => ({
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              tickets: {
                create: ticketsByItem[index].map((ticket) => ({
                  code: ticket.code,
                  currentOwnerUserId: ticket.currentOwnerUserId,
                  holderName: ticket.holderName,
                  holderEmail: ticket.holderEmail,
                  holderCpf: ticket.holderCpf,
                  status: 'AVAILABLE',
                })),
              },
            })),
          },
        },
        include: this.orderInclude,
      });

      for (const item of itemsData) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      await this.createTransferRequestsForOrder(order.id, ticketsByItem, tx);

      if (walletAppliedAmount.gt(0)) {
        await tx.walletTransaction.create({
          data: {
            userId,
            type: 'DEBIT',
            source: 'ORDER_PAYMENT',
            sourceId: order.id,
            amount: walletAppliedAmount,
            description: `Uso de wallet no pedido ${order.id}`,
          },
        });

        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: walletAppliedAmount,
            method: 'WALLET',
            status: 'PAID',
            paidAt: new Date(),
          },
        });
      }

      if (orderStatus === 'PAID') {
        await this.activateOrderTransferRequests(order.id, tx);
      }

      const updatedOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: this.orderInclude,
      });

      return {
        order: updatedOrder,
        walletAppliedAmount,
        remainingAmount,
      };
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: this.orderInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    return order;
  }

  async findByEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    return this.prisma.order.findMany({
      where: { eventId },
      include: this.orderInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findCustomerOrders(customerEmail: string) {
    return this.prisma.order.findMany({
      where: {
        customerEmail,
      },
      include: this.orderInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findCustomerOrderById(orderId: string, customerEmail: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (order.customerEmail !== customerEmail) {
      throw new ForbiddenException(
        'Você não tem permissão para visualizar este pedido',
      );
    }

    return order;
  }

  async cancelCustomerTicket(
    ticketId: string,
    userId: string,
    customerEmail: string,
    body?: CancelTicketDto,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        orderItem: {
          include: {
            order: true,
            ticketType: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado');
    }

    const order = ticket.orderItem.order;

    if (order.customerEmail !== customerEmail && order.customerUserId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para cancelar este ingresso',
      );
    }

    if (ticket.status === 'USED') {
      throw new BadRequestException(
        'Não é possível cancelar um ingresso já utilizado',
      );
    }

    if (ticket.status === 'CANCELED') {
      throw new BadRequestException('Este ingresso já está cancelado');
    }

    if (order.status === 'CANCELED') {
      throw new BadRequestException('O pedido já está cancelado');
    }

    const originalAmount = new Prisma.Decimal(ticket.orderItem.unitPrice);

    if (order.status !== 'PAID') {
      return this.prisma.$transaction(async (tx) => {
        const cancellation = await tx.ticketCancellation.create({
          data: {
            ticketId: ticket.id,
            orderId: order.id,
            userId,
            mode: 'NO_REFUND_PENDING',
            originalAmount,
            returnedAmount: new Prisma.Decimal(0),
            status: 'NO_REFUND',
          },
        });

        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'CANCELED',
          },
        });

        await tx.ticketTransferRequest.updateMany({
          where: {
            ticketId: ticket.id,
            status: {
              in: ['PENDING_PAYMENT', 'PENDING_ACCEPTANCE'],
            },
          },
          data: {
            status: 'CANCELED',
            respondedAt: new Date(),
            responseReason: 'Ticket cancelado pelo cliente',
          },
        });

        await tx.ticketType.update({
          where: { id: ticket.orderItem.ticketTypeId },
          data: {
            quantity: {
              increment: 1,
            },
          },
        });

        const updatedTotalAmount = new Prisma.Decimal(order.totalAmount).sub(
          originalAmount,
        );

        const safeTotalAmount = updatedTotalAmount.lt(0)
          ? new Prisma.Decimal(0)
          : updatedTotalAmount;

        const remainingTickets = await tx.ticket.count({
          where: {
            orderItem: {
              orderId: order.id,
            },
            status: {
              not: 'CANCELED',
            },
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            totalAmount: safeTotalAmount,
            status: remainingTickets === 0 ? 'CANCELED' : 'PENDING',
          },
        });

        const updatedOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: this.orderInclude,
        });

        return {
          message: 'Ingresso pendente cancelado sem crédito e sem estorno',
          cancellation,
          order: updatedOrder,
        };
      });
    }

    const config = this.getCancellationConfig(body?.mode);
    const returnedAmount = originalAmount.mul(config.percent);

    return this.prisma.$transaction(async (tx) => {
      const cancellation = await tx.ticketCancellation.create({
        data: {
          ticketId: ticket.id,
          orderId: order.id,
          userId,
          mode: config.mode,
          originalAmount,
          returnedAmount,
          status: config.cancellationStatus,
        },
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'CANCELED',
        },
      });

      await tx.ticketTransferRequest.updateMany({
        where: {
          ticketId: ticket.id,
          status: {
            in: ['PENDING_PAYMENT', 'PENDING_ACCEPTANCE'],
          },
        },
        data: {
          status: 'CANCELED',
          respondedAt: new Date(),
          responseReason: 'Ticket cancelado pelo cliente',
        },
      });

      await tx.ticketType.update({
        where: { id: ticket.orderItem.ticketTypeId },
        data: {
          quantity: {
            increment: 1,
          },
        },
      });

      if (config.createWalletCredit) {
        await tx.walletTransaction.create({
          data: {
            userId,
            type: 'CREDIT',
            source: 'TICKET_CANCELLATION',
            sourceId: cancellation.id,
            amount: returnedAmount,
            description: `Crédito de 80% pelo cancelamento do ingresso ${ticket.code}`,
          },
        });
      }

      const remainingTickets = await tx.ticket.count({
        where: {
          orderItem: {
            orderId: order.id,
          },
          status: {
            not: 'CANCELED',
          },
        },
      });

      if (remainingTickets === 0) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELED',
          },
        });
      }

      const updatedOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: this.orderInclude,
      });

      return {
        message:
          config.mode === 'WALLET_80'
            ? 'Ingresso pago cancelado com 80% de crédito na wallet'
            : 'Ingresso pago cancelado com solicitação de estorno de 70%',
        cancellation,
        order: updatedOrder,
      };
    });
  }

  async cancelCustomerOrder(
    orderId: string,
    userId: string,
    customerEmail: string,
    body?: CancelOrderDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (order.customerEmail !== customerEmail && order.customerUserId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para cancelar este pedido',
      );
    }

    if (order.status === 'CANCELED') {
      throw new BadRequestException('Pedido já está cancelado');
    }

    const usedTicket = order.items.some((item) =>
      item.tickets.some((ticket) => ticket.status === 'USED'),
    );

    if (usedTicket) {
      throw new BadRequestException(
        'Não é possível cancelar um pedido com ingresso já utilizado',
      );
    }

    const cancelablePairs = order.items.flatMap((item) =>
      item.tickets
        .filter((ticket) => ticket.status !== 'CANCELED')
        .map((ticket) => ({
          item,
          ticket,
        })),
    );

    if (!cancelablePairs.length) {
      throw new BadRequestException(
        'Todos os ingressos elegíveis deste pedido já foram cancelados',
      );
    }

    if (order.status !== 'PAID') {
      return this.prisma.$transaction(async (tx) => {
        for (const pair of cancelablePairs) {
          const originalAmount = new Prisma.Decimal(pair.item.unitPrice);

          await tx.ticketCancellation.create({
            data: {
              ticketId: pair.ticket.id,
              orderId: order.id,
              userId,
              mode: 'NO_REFUND_PENDING',
              originalAmount,
              returnedAmount: new Prisma.Decimal(0),
              status: 'NO_REFUND',
            },
          });

          await tx.ticket.update({
            where: { id: pair.ticket.id },
            data: {
              status: 'CANCELED',
            },
          });

          await tx.ticketTransferRequest.updateMany({
            where: {
              ticketId: pair.ticket.id,
              status: {
                in: ['PENDING_PAYMENT', 'PENDING_ACCEPTANCE'],
              },
            },
            data: {
              status: 'CANCELED',
              respondedAt: new Date(),
              responseReason: 'Pedido cancelado pelo cliente',
            },
          });

          await tx.ticketType.update({
            where: { id: pair.item.ticketTypeId },
            data: {
              quantity: {
                increment: 1,
              },
            },
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELED',
            totalAmount: new Prisma.Decimal(0),
          },
        });

        const updatedOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: this.orderInclude,
        });

        return {
          message: 'Pedido pendente cancelado sem crédito e sem estorno',
          summary: {
            canceledTickets: cancelablePairs.length,
            originalAmount: order.totalAmount,
            returnedAmount: new Prisma.Decimal(0),
            mode: 'NO_REFUND_PENDING',
          },
          order: updatedOrder,
        };
      });
    }

    const config = this.getCancellationConfig(body?.mode);

    return this.prisma.$transaction(async (tx) => {
      let totalOriginalAmount = new Prisma.Decimal(0);
      let totalReturnedAmount = new Prisma.Decimal(0);

      for (const pair of cancelablePairs) {
        const originalAmount = new Prisma.Decimal(pair.item.unitPrice);
        const returnedAmount = originalAmount.mul(config.percent);

        totalOriginalAmount = totalOriginalAmount.add(originalAmount);
        totalReturnedAmount = totalReturnedAmount.add(returnedAmount);

        await tx.ticketCancellation.create({
          data: {
            ticketId: pair.ticket.id,
            orderId: order.id,
            userId,
            mode: config.mode,
            originalAmount,
            returnedAmount,
            status: config.cancellationStatus,
          },
        });

        await tx.ticket.update({
          where: { id: pair.ticket.id },
          data: {
            status: 'CANCELED',
          },
        });

        await tx.ticketTransferRequest.updateMany({
          where: {
            ticketId: pair.ticket.id,
            status: {
              in: ['PENDING_PAYMENT', 'PENDING_ACCEPTANCE'],
            },
          },
          data: {
            status: 'CANCELED',
            respondedAt: new Date(),
            responseReason: 'Pedido cancelado pelo cliente',
          },
        });

        await tx.ticketType.update({
          where: { id: pair.item.ticketTypeId },
          data: {
            quantity: {
              increment: 1,
            },
          },
        });
      }

      if (config.createWalletCredit && totalReturnedAmount.gt(0)) {
        await tx.walletTransaction.create({
          data: {
            userId,
            type: 'CREDIT',
            source: 'ORDER_CANCELLATION',
            sourceId: order.id,
            amount: totalReturnedAmount,
            description: `Crédito de 80% pelo cancelamento do pedido ${order.id}`,
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELED',
        },
      });

      const updatedOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: this.orderInclude,
      });

      return {
        message:
          config.mode === 'WALLET_80'
            ? 'Pedido pago cancelado com 80% de crédito na wallet'
            : 'Pedido pago cancelado com solicitação de estorno de 70%',
        summary: {
          canceledTickets: cancelablePairs.length,
          originalAmount: totalOriginalAmount,
          returnedAmount: totalReturnedAmount,
          mode: config.mode,
        },
        order: updatedOrder,
      };
    });
  }

  async cancel(orderId: string, _data?: CancelOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (order.status === 'CANCELED') {
      throw new BadRequestException('Pedido já está cancelado');
    }

    const usedTicket = order.items.some((item) =>
      item.tickets.some((ticket) => ticket.status === 'USED'),
    );

    if (usedTicket) {
      throw new BadRequestException(
        'Não é possível cancelar um pedido com ingresso já utilizado',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const ticketsToCancel = item.tickets.filter(
          (ticket) => ticket.status !== 'CANCELED',
        );

        if (ticketsToCancel.length > 0) {
          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              quantity: {
                increment: ticketsToCancel.length,
              },
            },
          });

          await tx.ticket.updateMany({
            where: {
              id: {
                in: ticketsToCancel.map((ticket) => ticket.id),
              },
            },
            data: {
              status: 'CANCELED',
            },
          });

          await tx.ticketTransferRequest.updateMany({
            where: {
              ticketId: {
                in: ticketsToCancel.map((ticket) => ticket.id),
              },
              status: {
                in: ['PENDING_PAYMENT', 'PENDING_ACCEPTANCE'],
              },
            },
            data: {
              status: 'CANCELED',
              respondedAt: new Date(),
              responseReason: 'Pedido cancelado administrativamente',
            },
          });
        }
      }

      const canceledOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELED',
        },
        include: this.orderInclude,
      });

      return {
        message: 'Pedido cancelado com sucesso',
        order: canceledOrder,
      };
    });
  }
}
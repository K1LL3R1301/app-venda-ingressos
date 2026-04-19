import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CancelTicketDto } from './dto/cancel-ticket.dto';
import { CreateOrderDto } from './dto/create-order.dto';

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
  } as const;

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

  async create(data: CreateOrderDto) {
    const { itemsData, totalAmount } = await this.prepareOrderItems(data);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          eventId: data.eventId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          totalAmount,
          status: 'PENDING',
          items: {
            create: itemsData.map((item) => ({
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              tickets: {
                create: Array.from({ length: item.quantity }).map(() => ({
                  code: crypto.randomUUID(),
                  holderName: data.customerName,
                  holderEmail: data.customerEmail,
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

      return order;
    });
  }

  async createCustomerOrder(
    userId: string,
    customerEmail: string,
    data: CreateOrderDto,
  ) {
    const mergedData: CreateOrderDto = {
      ...data,
      customerEmail,
    };

    const { itemsData, totalAmount } = await this.prepareOrderItems(mergedData);

    const walletBalance = mergedData.useWalletBalance
      ? await this.getWalletBalance(userId)
      : new Prisma.Decimal(0);

    const walletAppliedAmount = totalAmount.gt(walletBalance)
      ? walletBalance
      : totalAmount;

    const remainingAmount = totalAmount.sub(walletAppliedAmount);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          eventId: mergedData.eventId,
          customerName: mergedData.customerName,
          customerEmail,
          totalAmount,
          status: remainingAmount.lte(0) ? 'PAID' : 'PENDING',
          items: {
            create: itemsData.map((item) => ({
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              tickets: {
                create: Array.from({ length: item.quantity }).map(() => ({
                  code: crypto.randomUUID(),
                  holderName: mergedData.customerName,
                  holderEmail: customerEmail,
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

    if (order.customerEmail !== customerEmail) {
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
          message:
            'Ingresso pendente cancelado sem crédito e sem estorno',
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

    if (order.customerEmail !== customerEmail) {
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
          message:
            'Pedido pendente cancelado sem crédito e sem estorno',
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
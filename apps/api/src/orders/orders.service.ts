import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrderDto) {
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

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          totalAmount,
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
        include: {
          items: {
            include: {
              ticketType: true,
              tickets: true,
            },
          },
          payments: true,
        },
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

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        items: {
          include: {
            ticketType: true,
            tickets: true,
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            ticketType: true,
            tickets: true,
          },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    return order;
  }

  async cancel(orderId: string, _data?: CancelOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            tickets: true,
            ticketType: true,
          },
        },
        payments: true,
      },
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
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });

        await tx.ticket.updateMany({
          where: {
            orderItemId: item.id,
          },
          data: {
            status: 'CANCELED',
          },
        });
      }

      const canceledOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELED',
        },
        include: {
          items: {
            include: {
              ticketType: true,
              tickets: true,
            },
          },
          payments: true,
        },
      });

      return {
        message: 'Pedido cancelado com sucesso',
        order: canceledOrder,
      };
    });
  }
}
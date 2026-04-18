import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
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

    if (order.status === 'CANCELED') {
      throw new BadRequestException(
        'Não é possível registrar pagamento para pedido cancelado',
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
        status: 'PAID',
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                ticketType: true,
                tickets: true,
              },
            },
            payments: true,
          },
        },
      },
    });

    if (order.status !== 'PAID') {
      await this.prisma.order.update({
        where: { id: data.orderId },
        data: {
          status: 'PAID',
        },
      });
    }

    return this.findById(payment.id);
  }

  async findAll() {
    return this.prisma.payment.findMany({
      include: {
        order: {
          include: {
            items: {
              include: {
                ticketType: true,
                tickets: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                ticketType: true,
                tickets: true,
              },
            },
            payments: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    return payment;
  }
}
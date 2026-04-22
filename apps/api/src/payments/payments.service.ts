import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private getPaidTotal(payments: { amount: Prisma.Decimal; status: string }[]) {
    let paidTotal = new Prisma.Decimal(0);

    for (const payment of payments) {
      if (payment.status === 'PAID') {
        paidTotal = paidTotal.add(payment.amount);
      }
    }

    return paidTotal;
  }

  private async activateOrderTransferRequests(
    orderId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
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
        transferRequests: true,
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

    const paidTotal = this.getPaidTotal(order.payments);
    const outstandingAmount = new Prisma.Decimal(order.totalAmount).sub(paidTotal);

    if (outstandingAmount.lte(0)) {
      throw new BadRequestException('Não há saldo pendente para pagamento');
    }

    const requestedAmount = data.amount
      ? new Prisma.Decimal(data.amount)
      : outstandingAmount;

    const amountToCharge = requestedAmount.gt(outstandingAmount)
      ? outstandingAmount
      : requestedAmount;

    const payment = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          orderId: data.orderId,
          amount: amountToCharge,
          method: data.method,
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      const newPaidTotal = paidTotal.add(amountToCharge);
      const orderWillBePaid = newPaidTotal.gte(order.totalAmount);

      await tx.order.update({
        where: { id: data.orderId },
        data: {
          status: orderWillBePaid ? 'PAID' : 'PENDING',
        },
      });

      if (orderWillBePaid) {
        await this.activateOrderTransferRequests(data.orderId, tx);
      }

      return createdPayment;
    });

    return this.findById(payment.id);
  }

  async finalizeCustomerPayment(
    orderId: string,
    customerEmail: string,
    method?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: true,
        items: {
          include: {
            ticketType: true,
            tickets: true,
          },
        },
        payments: true,
        transferRequests: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (order.customerEmail !== customerEmail) {
      throw new ForbiddenException(
        'Você não tem permissão para finalizar este pagamento',
      );
    }

    if (order.status === 'CANCELED') {
      throw new BadRequestException('Pedido cancelado não pode ser pago');
    }

    const paidTotal = this.getPaidTotal(order.payments);
    const outstandingAmount = new Prisma.Decimal(order.totalAmount).sub(paidTotal);

    if (outstandingAmount.lte(0)) {
      throw new BadRequestException('Não há saldo pendente para pagamento');
    }

    const normalizedMethod = method?.trim() || 'PIX';

    const payment = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: outstandingAmount,
          method: normalizedMethod,
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
        },
      });

      await this.activateOrderTransferRequests(order.id, tx);

      return createdPayment;
    });

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
            transferRequests: true,
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
            event: true,
            items: {
              include: {
                ticketType: true,
                tickets: true,
              },
            },
            payments: true,
            transferRequests: true,
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
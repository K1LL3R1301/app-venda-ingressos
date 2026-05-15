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
  private async astroCreateCommercialSaleFromPaidOrder(orderId: string, db: any) {
    const order = await db.order.findUnique({ where: { id: orderId }, include: { event: true } });
    if (!order || order.status !== 'PAID') return;
    const existing = await db.astroPromoterSale.findFirst({ where: { orderId: order.id, source: 'CHECKOUT' } });
    if (existing) return;
    const coupon = order.couponId ? await db.astroCoupon.findUnique({ where: { id: order.couponId }, include: { promoter: true } }) : null;
    const link = order.promoterLinkId ? await db.astroPromoterLink.findUnique({ where: { id: order.promoterLinkId }, include: { promoter: true } }) : null;
    const promoterId = order.promoterId || coupon?.promoterId || link?.promoterId || null;
    if (!promoterId) return;
    const promoter = await db.astroPromoter.findUnique({ where: { id: promoterId } });
    const grossAmount = Number(order.grossAmount || order.totalAmount || 0);
    const discountAmount = Number(order.discountAmount || 0);
    const netAmount = Number(order.totalAmount || 0);
    const commissionValue = Number(promoter?.commissionValue || 0);
    const type = String(promoter?.commissionType || 'PERCENT').toUpperCase();
    const base = String(promoter?.commissionBase || 'NET_AMOUNT').toUpperCase();
    const baseAmount = base === 'GROSS_AMOUNT' ? grossAmount : base === 'AFTER_DISCOUNT' ? Math.max(0, grossAmount - discountAmount) : netAmount;
    const commissionAmount = type === 'FIXED_PER_ORDER' || type === 'FIXED_PER_TICKET' ? commissionValue : type === 'NONE' ? 0 : Math.round(((baseAmount * commissionValue) / 100) * 100) / 100;
    await db.astroPromoterSale.create({ data: { protocol: `ASTRO-VEN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, adminUserId: promoter?.adminUserId || coupon?.adminUserId || link?.adminUserId || 'SYSTEM', eventId: order.eventId, eventTitle: order.event?.name || null, promoterId, couponId: coupon?.id || order.couponId || null, linkId: link?.id || order.promoterLinkId || null, orderId: order.id, customerName: order.customerName || null, customerEmail: order.customerEmail || null, customerCpf: String(order.customerCpf || '').replace(/\D/g, '') || null, grossAmount, discountAmount, netAmount, commissionAmount, status: 'PAID', source: 'CHECKOUT', paidAt: new Date(), notes: 'Venda criada automaticamente pelo pagamento do pedido' } });
    if (coupon?.id) await db.astroCoupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    if (link?.id) {
      const sales = await db.astroPromoterSale.findMany({ where: { linkId: link.id, status: 'PAID' } });
      const revenue = sales.reduce((sum: number, sale: any) => sum + Number(sale.netAmount || 0), 0);
      const commission = sales.reduce((sum: number, sale: any) => sum + Number(sale.commissionAmount || 0), 0);
      await db.astroPromoterLink.update({ where: { id: link.id }, data: { ordersPaid: sales.length, revenue, commission } });
    }
  }

  private getPaidTotal(payments: { amount: Prisma.Decimal; status: string }[]) {
    let paidTotal = new Prisma.Decimal(0);

    for (const payment of payments) {
      if (payment.status === 'PAID') {
        paidTotal = paidTotal.add(payment.amount);
      }
    }

    return paidTotal;
  }

  private async markOrderPlacesAsSold(
    orderId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    await db.$executeRawUnsafe(
      `UPDATE "PlaceReservation"
          SET "status" = 'SOLD', "expiresAt" = NULL, "updatedAt" = NOW()
        WHERE "orderId" = $1
          AND "status" = 'HELD'`,
      orderId,
    );
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
        await this.markOrderPlacesAsSold(data.orderId, tx);
        await this.activateOrderTransferRequests(data.orderId, tx);
        await this.astroCreateCommercialSaleFromPaidOrder(data.orderId, tx);
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

      await this.markOrderPlacesAsSold(order.id, tx);
      await this.activateOrderTransferRequests(order.id, tx);
      await this.astroCreateCommercialSaleFromPaidOrder(order.id, tx);

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

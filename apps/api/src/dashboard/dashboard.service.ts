import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      organizers,
      events,
      ticketTypes,
      orders,
      tickets,
      checkins,
      paidOrders,
      pendingOrders,
      canceledOrders,
      paidRevenue,
    ] = await Promise.all([
      this.prisma.organizer.count(),
      this.prisma.event.count(),
      this.prisma.ticketType.count(),
      this.prisma.order.count(),
      this.prisma.ticket.count(),
      this.prisma.checkin.count(),
      this.prisma.order.count({
        where: { status: 'PAID' },
      }),
      this.prisma.order.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.order.count({
        where: { status: 'CANCELED' },
      }),
      this.prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'PAID',
        },
      }),
    ]);

    return {
      organizers,
      events,
      ticketTypes,
      orders,
      tickets,
      checkins,
      ordersByStatus: {
        paid: paidOrders,
        pending: pendingOrders,
        canceled: canceledOrders,
      },
      revenue: {
        paidTotal: paidRevenue._sum.amount ?? new Prisma.Decimal(0),
      },
    };
  }

  async getOperatorSummary() {
    const [events, orders, paidRevenue] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.order.count(),
      this.prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'PAID',
        },
      }),
    ]);

    return {
      events,
      orders,
      revenue: {
        paidTotal: paidRevenue._sum.amount ?? new Prisma.Decimal(0),
      },
    };
  }
}
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ScopeUser = {
  sub?: string;
  email?: string;
  role?: string;
  cpf?: string;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  

  private normalizeScopeCpf(value?: string | null) {
    return String(value || '').replace(/\D/g, '');
  }

  private normalizeScopeEmail(value?: string | null) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized || undefined;
  }

  private organizerScopeWhere(user?: ScopeUser): Prisma.OrganizerWhereInput {
    const email = this.normalizeScopeEmail(user?.email);
    const cpf = this.normalizeScopeCpf(user?.cpf);
    const or: Prisma.OrganizerWhereInput[] = [];

    if (user?.sub) or.push({ ownerUserId: user.sub });
    if (email) or.push({ email });
    if (cpf) or.push({ document: cpf });

    return or.length > 0 ? { OR: or } : { id: '__NO_ORGANIZER_SCOPE__' };
  }
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


  async getAdminScopeSummary(user: ScopeUser) {
    const role = String(user?.role || '').toUpperCase();

    if (role === 'SUPER_ADMIN') {
      return this.getSummary();
    }

    const organizerWhere = this.organizerScopeWhere(user);
    const eventWhere: Prisma.EventWhereInput = { organizer: organizerWhere };
    const orderWhere: Prisma.OrderWhereInput = { event: eventWhere };

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
      this.prisma.organizer.count({ where: organizerWhere }),
      this.prisma.event.count({ where: eventWhere }),
      this.prisma.ticketType.count({ where: { event: eventWhere } }),
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.ticket.count({ where: { orderItem: { order: orderWhere } } }),
      this.prisma.checkin.count({ where: { ticket: { orderItem: { order: orderWhere } } } }),
      this.prisma.order.count({ where: { ...orderWhere, status: 'PAID' } }),
      this.prisma.order.count({ where: { ...orderWhere, status: 'PENDING' } }),
      this.prisma.order.count({ where: { ...orderWhere, status: 'CANCELED' } }),
      this.prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'PAID',
          order: orderWhere,
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
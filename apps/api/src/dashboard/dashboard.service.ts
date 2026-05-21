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


  private decimal(value: unknown) {
    return new Prisma.Decimal(String(value ?? 0));
  }

  private sumDecimals<T>(items: T[], selector: (item: T) => unknown) {
    return items.reduce(
      (sum, item) => sum.add(this.decimal(selector(item))),
      new Prisma.Decimal(0),
    );
  }

  private parseFinancialDateRange(query?: Record<string, string>) {
    const fromText = String(query?.from || query?.start || '').trim();
    const toText = String(query?.to || query?.end || '').trim();
    const createdAt: Prisma.DateTimeFilter = {};

    if (fromText) {
      const from = new Date(fromText);
      if (!Number.isNaN(from.getTime())) createdAt.gte = from;
    }

    if (toText) {
      const to = new Date(toText);
      if (!Number.isNaN(to.getTime())) createdAt.lte = to;
    }

    return Object.keys(createdAt).length ? createdAt : undefined;
  }

  private financialEventWhere(user: ScopeUser, query?: Record<string, string>): Prisma.EventWhereInput {
    const role = String(user?.role || '').toUpperCase();
    const eventId = String(query?.eventId || '').trim();
    const organizerId = String(query?.organizerId || '').trim();
    const and: Prisma.EventWhereInput[] = [];

    if (role !== 'SUPER_ADMIN') and.push({ organizer: this.organizerScopeWhere(user) });
    if (eventId) and.push({ id: eventId });
    if (organizerId) and.push({ organizerId });

    return and.length > 0 ? { AND: and } : {};
  }

  async getFinancialSummary(user: ScopeUser, query?: Record<string, string>) {
    const createdAt = this.parseFinancialDateRange(query);
    const eventWhere = this.financialEventWhere(user, query);
    const orderWhere: Prisma.OrderWhereInput = { event: eventWhere };
    const orderCreatedWhere: Prisma.OrderWhereInput = {
      ...orderWhere,
      ...(createdAt ? { createdAt } : {}),
    };

    const [
      paidPayments,
      activePaidOrders,
      canceledOrders,
      cancellations,
      bankWithdrawals,
      checkins,
      usedTickets,
      activeTickets,
    ] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'PAID', ...(createdAt ? { createdAt } : {}), order: orderWhere },
        include: { order: { include: { event: { include: { organizer: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: { ...orderCreatedWhere, status: 'PAID' },
        include: { event: { include: { organizer: true } }, items: { include: { tickets: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: { ...orderCreatedWhere, status: 'CANCELED' },
        include: { event: { include: { organizer: true } }, items: { include: { tickets: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticketCancellation.findMany({
        where: { ...(createdAt ? { createdAt } : {}), ticket: { orderItem: { order: orderWhere } } },
        include: {
          order: { include: { event: { include: { organizer: true } } } },
          ticket: { include: { orderItem: { include: { order: { include: { event: { include: { organizer: true } } } } } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.findMany({
        where: { type: 'DEBIT', source: 'WALLET_BANK_WITHDRAWAL', ...(createdAt ? { createdAt } : {}) },
        include: { user: { select: { id: true, name: true, email: true, cpf: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.checkin.count({
        where: { ...(createdAt ? { createdAt } : {}), ticket: { orderItem: { order: orderWhere } } },
      }),
      this.prisma.ticket.count({ where: { status: 'USED', orderItem: { order: orderWhere } } }),
      this.prisma.ticket.count({ where: { status: 'AVAILABLE', orderItem: { order: orderWhere } } }),
    ]);

    const paidPaymentsGrossTotal = this.sumDecimals(paidPayments, (p) => p.amount);
    const activePaidOrdersTotal = this.sumDecimals(activePaidOrders, (o) => o.totalAmount);
    const canceledOriginalTotal = this.sumDecimals(cancellations, (c) => c.originalAmount);
    const walletCreditTotal = this.sumDecimals(
      cancellations.filter((c) => c.mode === 'WALLET_80'),
      (c) => c.returnedAmount,
    );
    const cancellationRetainedTotal = canceledOriginalTotal.sub(walletCreditTotal);
    const bankWithdrawalGrossTotal = this.sumDecimals(bankWithdrawals, (tx) => tx.amount);
    const bankWithdrawalFeeTotal = bankWithdrawalGrossTotal.mul(new Prisma.Decimal(0.25));
    const bankPayoutNetTotal = bankWithdrawalGrossTotal.sub(bankWithdrawalFeeTotal);
    const totalRetainedTotal = cancellationRetainedTotal.add(bankWithdrawalFeeTotal);
    const totalTicketsInActivePaidOrders = activePaidOrders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.tickets.length, 0),
      0,
    );

    const byOrganizerMap = new Map<string, any>();
    const organizerInfo = (order: any) => {
      const organizer = order?.event?.organizer;
      return {
        id: String(organizer?.id || order?.event?.organizerId || 'unknown'),
        name: organizer?.tradeName || organizer?.legalName || organizer?.email || String(organizer?.id || order?.event?.organizerId || 'Organizador'),
      };
    };
    const rowFor = (order: any) => {
      const info = organizerInfo(order);
      if (!byOrganizerMap.has(info.id)) {
        byOrganizerMap.set(info.id, {
          organizerId: info.id,
          organizerName: info.name,
          paidPaymentsGrossTotal: new Prisma.Decimal(0),
          activePaidOrdersTotal: new Prisma.Decimal(0),
          canceledOriginalTotal: new Prisma.Decimal(0),
          walletCreditTotal: new Prisma.Decimal(0),
          cancellationRetainedTotal: new Prisma.Decimal(0),
          payments: 0,
        });
      }
      return byOrganizerMap.get(info.id);
    };

    for (const payment of paidPayments) {
      const row = rowFor(payment.order);
      row.paidPaymentsGrossTotal = row.paidPaymentsGrossTotal.add(payment.amount);
      row.payments += 1;
    }

    for (const order of activePaidOrders) {
      const row = rowFor(order);
      row.activePaidOrdersTotal = row.activePaidOrdersTotal.add(order.totalAmount);
    }

    for (const cancellation of cancellations) {
      const row = rowFor(cancellation.order || cancellation.ticket?.orderItem?.order);
      const original = this.decimal(cancellation.originalAmount);
      const returned = this.decimal(cancellation.returnedAmount);
      row.canceledOriginalTotal = row.canceledOriginalTotal.add(original);
      row.walletCreditTotal = row.walletCreditTotal.add(returned);
      row.cancellationRetainedTotal = row.cancellationRetainedTotal.add(original.sub(returned));
    }

    return {
      filters: {
        eventId: query?.eventId || null,
        organizerId: query?.organizerId || null,
        from: query?.from || query?.start || null,
        to: query?.to || query?.end || null,
      },
      rules: {
        cancellationWalletPercent: '80%',
        withdrawalBankPercentOfWallet: '75%',
        withdrawalBankPercentOfOriginalTicket: '60%',
        withdrawalFeePercentOfWallet: '25%',
        withdrawalFeePercentOfOriginalTicket: '20%',
        note: 'Cancelamento credita 80% na wallet. Saque debita o saldo da wallet e envia 75% dele ao banco, equivalente a 60% do valor original.',
      },
      totals: {
        paidPaymentsGrossTotal,
        activePaidOrdersTotal,
        paidPaymentsCount: paidPayments.length,
        activePaidOrdersCount: activePaidOrders.length,
        canceledOrdersCount: canceledOrders.length,
        canceledOriginalTotal,
        walletCreditTotal,
        cancellationRetainedTotal,
        bankWithdrawalGrossTotal,
        bankWithdrawalFeeTotal,
        bankPayoutNetTotal,
        totalRetainedTotal,
        checkins,
        usedTickets,
        activeTickets,
        totalTicketsInActivePaidOrders,
      },
      byOrganizer: Array.from(byOrganizerMap.values()).sort(
        (a, b) => Number(b.paidPaymentsGrossTotal) - Number(a.paidPaymentsGrossTotal),
      ),
      latest: {
        payments: paidPayments.slice(0, 10).map((p) => ({ id: p.id, orderId: p.orderId, amount: p.amount, status: p.status, createdAt: p.createdAt, eventId: p.order?.eventId, eventName: p.order?.event?.name })),
        cancellations: cancellations.slice(0, 10).map((c) => ({ id: c.id, ticketId: c.ticketId, orderId: c.orderId, mode: c.mode, originalAmount: c.originalAmount, returnedAmount: c.returnedAmount, status: c.status, createdAt: c.createdAt, eventId: c.order?.eventId, eventName: c.order?.event?.name })),
        bankWithdrawals: bankWithdrawals.slice(0, 10).map((tx) => {
          const grossAmount = this.decimal(tx.amount);
          const feeAmount = grossAmount.mul(new Prisma.Decimal(0.25));
          return { id: tx.id, userId: tx.userId, userName: tx.user?.name, userEmail: tx.user?.email, grossAmount, feeAmount, bankAmount: grossAmount.sub(feeAmount), createdAt: tx.createdAt, description: tx.description };
        }),
      },
      scopeNotes: {
        bankWithdrawals: 'Saques bancarios sao filtrados por periodo. Ainda nao possuem rateio por evento porque o saque usa saldo consolidado da wallet.',
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
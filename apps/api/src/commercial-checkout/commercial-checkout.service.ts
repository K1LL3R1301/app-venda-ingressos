import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function clean(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeCode(value: unknown) {
  return clean(value).toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9_-]/g, '');
}

function normalizeCpf(value: unknown) {
  return clean(value).replace(/\D/g, '');
}

function normalizeSlug(value: unknown) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function moneyNumber(value: unknown) {
  const raw = clean(value).replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function makeProtocol(prefix: string) {
  const now = new Date();
  const datePart = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('');
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ASTRO-${prefix}-${datePart}-${randomPart}`;
}

@Injectable()
export class CommercialCheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateDiscount(coupon: any, subtotal: number) {
    const type = clean(coupon.discountType || 'PERCENT').toUpperCase();
    const value = moneyNumber(coupon.discountValue);
    if (type === 'FREE') return subtotal;
    if (type === 'FIXED') return Math.min(subtotal, value);
    const raw = (subtotal * value) / 100;
    const max = moneyNumber(coupon.maxDiscount);
    return Math.min(subtotal, max > 0 ? Math.min(raw, max) : raw);
  }

  async validateCoupon(body: any) {
    const eventId = clean(body.eventId);
    const code = normalizeCode(body.code);
    const subtotal = moneyNumber(body.subtotal);
    const customerCpf = normalizeCpf(body.customerCpf);

    if (!eventId) throw new BadRequestException('Informe o evento');
    if (!code) throw new BadRequestException('Informe o cupom');
    if (subtotal <= 0) throw new BadRequestException('Subtotal invalido');

    const coupon = await (this.prisma as any).astroCoupon.findFirst({
      where: {
        code,
        status: 'ACTIVE',
        OR: [{ eventId }, { eventId: null }],
      },
      include: { promoter: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!coupon) throw new NotFoundException('Cupom nao encontrado ou inativo para este evento');

    const now = Date.now();
    if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) throw new BadRequestException('Cupom ainda nao esta valido');
    if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) throw new BadRequestException('Cupom expirado');
    if (coupon.usageLimit && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)) throw new BadRequestException('Cupom atingiu limite total');

    if (coupon.perCpfLimit && customerCpf) {
      const usedByCpf = await (this.prisma as any).astroPromoterSale.count({
        where: { couponId: coupon.id, customerCpf, status: 'PAID' },
      });
      if (usedByCpf >= Number(coupon.perCpfLimit)) throw new BadRequestException('CPF ja atingiu limite de uso deste cupom');
    }

    const discountAmount = this.calculateDiscount(coupon, subtotal);
    const totalAmount = Math.max(0, subtotal - discountAmount);

    return {
      valid: true,
      couponId: coupon.id,
      couponCode: coupon.code,
      promoterId: coupon.promoterId,
      promoterName: coupon.promoter?.name || null,
      grossAmount: subtotal,
      discountAmount,
      totalAmount,
      message: `Cupom ${coupon.code} aplicado`,
    };
  }

  async resolveRef(body: any) {
    const ref = normalizeSlug(body.ref);
    if (!ref) throw new BadRequestException('Informe o ref');

    const link = await (this.prisma as any).astroPromoterLink.findUnique({
      where: { slug: ref },
      include: { promoter: true },
    });

    if (!link || link.status !== 'ACTIVE') throw new NotFoundException('Ref nao encontrado ou inativo');

    await (this.prisma as any).astroPromoterLink.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } },
    });

    return {
      valid: true,
      ref: link.slug,
      linkId: link.id,
      promoterId: link.promoterId,
      promoterName: link.promoter?.name || null,
      eventId: link.eventId,
      eventTitle: link.eventTitle,
      url: link.url,
    };
  }

  private calculateCommission(promoter: any, sale: { grossAmount: number; discountAmount: number; netAmount: number }) {
    if (!promoter) return 0;
    const type = clean(promoter.commissionType || 'PERCENT').toUpperCase();
    const base = clean(promoter.commissionBase || 'NET_AMOUNT').toUpperCase();
    const commissionValue = moneyNumber(promoter.commissionValue);
    const baseAmount = base === 'GROSS_AMOUNT' ? sale.grossAmount : base === 'AFTER_DISCOUNT' ? Math.max(0, sale.grossAmount - sale.discountAmount) : sale.netAmount;
    if (type === 'FIXED_PER_ORDER' || type === 'FIXED_PER_TICKET') return commissionValue;
    if (type === 'NONE') return 0;
    return Math.round(((baseAmount * commissionValue) / 100) * 100) / 100;
  }

  async createSaleFromPaidOrder(orderId: string, db: any = this.prisma) {
    const order = await db.order.findUnique({ where: { id: orderId }, include: { event: true } });
    if (!order || order.status !== 'PAID') return null;

    const existing = await db.astroPromoterSale.findFirst({ where: { orderId: order.id, source: 'CHECKOUT' } });
    if (existing) return existing;

    const coupon = order.couponId ? await db.astroCoupon.findUnique({ where: { id: order.couponId }, include: { promoter: true } }) : null;
    const link = order.promoterLinkId ? await db.astroPromoterLink.findUnique({ where: { id: order.promoterLinkId }, include: { promoter: true } }) : null;
    const promoterId = order.promoterId || coupon?.promoterId || link?.promoterId || null;
    if (!promoterId) return null;

    const promoter = await db.astroPromoter.findUnique({ where: { id: promoterId } });
    const grossAmount = moneyNumber(order.grossAmount || order.totalAmount);
    const discountAmount = moneyNumber(order.discountAmount);
    const netAmount = moneyNumber(order.totalAmount);
    const commissionAmount = this.calculateCommission(promoter, { grossAmount, discountAmount, netAmount });

    const sale = await db.astroPromoterSale.create({
      data: {
        protocol: makeProtocol('VEN'),
        adminUserId: promoter?.adminUserId || coupon?.adminUserId || link?.adminUserId || 'SYSTEM',
        eventId: order.eventId,
        eventTitle: order.event?.name || null,
        promoterId,
        couponId: coupon?.id || order.couponId || null,
        linkId: link?.id || order.promoterLinkId || null,
        orderId: order.id,
        customerName: order.customerName || null,
        customerEmail: order.customerEmail || null,
        customerCpf: normalizeCpf(order.customerCpf) || null,
        grossAmount,
        discountAmount,
        netAmount,
        commissionAmount,
        status: 'PAID',
        source: 'CHECKOUT',
        paidAt: new Date(),
        notes: 'Venda criada automaticamente pelo pagamento do pedido',
      },
    });

    if (coupon?.id) await db.astroCoupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    if (link?.id) await this.syncLinkTotals(link.id, db);
    return sale;
  }

  async syncLinkTotals(linkId: string, db: any = this.prisma) {
    const sales = await db.astroPromoterSale.findMany({ where: { linkId, status: 'PAID' } });
    const revenue = sales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.netAmount), 0);
    const commission = sales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.commissionAmount), 0);
    await db.astroPromoterLink.update({ where: { id: linkId }, data: { ordersPaid: sales.length, revenue, commission } });
  }

  async syncPaidOrder(body: any) {
    const orderId = clean(body.orderId);
    if (!orderId) throw new BadRequestException('Informe o pedido');
    return this.createSaleFromPaidOrder(orderId);
  }

  async syncCanceledOrder(body: any) {
    const orderId = clean(body.orderId);
    if (!orderId) throw new BadRequestException('Informe o pedido');

    const sale = await (this.prisma as any).astroPromoterSale.findFirst({ where: { orderId, status: 'PAID' } });
    if (!sale) return { ok: true, message: 'Nenhuma venda paga encontrada para este pedido' };

    const updated = await (this.prisma as any).astroPromoterSale.update({
      where: { id: sale.id },
      data: { status: 'CANCELED', commissionAmount: 0, notes: `${clean(sale.notes)}\nCancelada/estornada pelo pedido ${orderId}`.trim() },
    });

    if (updated.linkId) await this.syncLinkTotals(updated.linkId);
    return updated;
  }
}
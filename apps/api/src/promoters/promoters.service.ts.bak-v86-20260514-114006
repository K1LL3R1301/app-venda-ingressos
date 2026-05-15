import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCouponDto,
  CreatePromoterDto,
  CreatePromoterLinkDto,
  CreatePromoterSaleDto,
  MarkPromoterCommissionPaidDto,
  SetCommercialStatusDto,
} from './dto/promoters.dto';

type AuthenticatedUser = {
  sub: string;
  email: string;
  role: string;
  name?: string;
};

function clean(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function role(value: unknown) {
  return clean(value).toUpperCase();
}

function assertAdmin(user: AuthenticatedUser) {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role(user.role))) {
    throw new ForbiddenException('Apenas administradores podem acessar Promoters e Cupons');
  }
}

function isSuperAdmin(user: AuthenticatedUser) {
  return role(user.role) === 'SUPER_ADMIN';
}

function moneyNumber(value: unknown) {
  const raw = clean(value).replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function integerNumber(value: unknown) {
  const parsed = Number(clean(value));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

function normalizeDocument(value: unknown) {
  return clean(value).replace(/\D/g, '');
}

function normalizeCode(value: unknown) {
  return clean(value).toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9_-]/g, '');
}

function normalizeSlug(value: unknown) {
  const slug = clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || Math.random().toString(36).slice(2, 10);
}

function makeProtocol(prefix: string) {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ASTRO-${prefix}-${datePart}-${randomPart}`;
}

function parseDate(value: unknown) {
  const text = clean(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCsvJson(value: unknown) {
  const text = clean(value);
  if (!text) return null;
  return text.split(',').map((item) => clean(item)).filter(Boolean);
}

function calculateCommission(promoter: any, sale: { grossAmount: number; discountAmount: number; netAmount: number }) {
  if (!promoter) return 0;
  const type = clean(promoter.commissionType || 'PERCENT').toUpperCase();
  const base = clean(promoter.commissionBase || 'NET_AMOUNT').toUpperCase();
  const commissionValue = moneyNumber(promoter.commissionValue);
  const baseAmount =
    base === 'GROSS_AMOUNT'
      ? sale.grossAmount
      : base === 'AFTER_DISCOUNT'
        ? Math.max(0, sale.grossAmount - sale.discountAmount)
        : sale.netAmount;
  if (type === 'FIXED_PER_ORDER') return commissionValue;
  if (type === 'FIXED_PER_TICKET') return commissionValue;
  if (type === 'NONE') return 0;
  return Math.round(((baseAmount * commissionValue) / 100) * 100) / 100;
}

@Injectable()
export class PromotersService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(user: AuthenticatedUser) {
    return isSuperAdmin(user) ? {} : { adminUserId: user.sub };
  }

  private async findEvent(eventId: string) {
    if (!eventId) return null;
    try {
      return await (this.prisma.event as any).findUnique({ where: { id: eventId } });
    } catch {
      return null;
    }
  }

  private async syncLinkTotals(linkId?: string | null) {
    const id = clean(linkId);
    if (!id) return;
    const sales = await (this.prisma.astroPromoterSale as any).findMany({ where: { linkId: id, status: 'PAID' } });
    const ordersPaid = sales.length;
    const revenue = sales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.netAmount), 0);
    const commission = sales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.commissionAmount), 0);
    await (this.prisma.astroPromoterLink as any).update({ where: { id }, data: { ordersPaid, revenue, commission } });
  }

  async overview(user: AuthenticatedUser) {
    assertAdmin(user);
    const [promoters, coupons, links, sales] = await Promise.all([
      (this.prisma.astroPromoter as any).findMany({ where: this.scopeWhere(user) }),
      (this.prisma.astroCoupon as any).findMany({ where: this.scopeWhere(user) }),
      (this.prisma.astroPromoterLink as any).findMany({ where: this.scopeWhere(user) }),
      (this.prisma.astroPromoterSale as any).findMany({ where: this.scopeWhere(user) }),
    ]);
    const paidSales = sales.filter((item: any) => clean(item.status) === 'PAID');
    const trackedRevenue = paidSales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.netAmount), 0);
    const commissionTotal = paidSales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.commissionAmount), 0);
    const paidCommission = promoters
      .filter((item: any) => clean(item.paymentStatus) === 'PAID')
      .reduce((sum: number, promoter: any) => {
        const promoterPaidSales = paidSales.filter((sale: any) => sale.promoterId === promoter.id);
        return sum + promoterPaidSales.reduce((saleSum: number, sale: any) => saleSum + moneyNumber(sale.commissionAmount), 0);
      }, 0);
    return {
      activePromoters: promoters.filter((item: any) => clean(item.status) === 'ACTIVE').length,
      activeCoupons: coupons.filter((item: any) => clean(item.status) === 'ACTIVE').length,
      links: links.length,
      salesPaid: paidSales.length,
      trackedRevenue,
      commissionTotal,
      commissionPending: Math.max(0, commissionTotal - paidCommission),
      paidCommission,
    };
  }

  async listPromoters(user: AuthenticatedUser) {
    assertAdmin(user);
    const promoters = await (this.prisma.astroPromoter as any).findMany({
      where: this.scopeWhere(user),
      include: { coupons: true, links: true, sales: true },
      orderBy: { createdAt: 'desc' },
    });
    return promoters.map((promoter: any) => {
      const paidSales = promoter.sales.filter((sale: any) => clean(sale.status) === 'PAID');
      const revenue = paidSales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.netAmount), 0);
      const commission = paidSales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.commissionAmount), 0);
      return { ...promoter, metrics: { paidSales: paidSales.length, revenue, commission, coupons: promoter.coupons.length, links: promoter.links.length } };
    });
  }

  async createPromoter(user: AuthenticatedUser, body: CreatePromoterDto) {
    assertAdmin(user);
    const name = clean(body.name);
    if (!name) throw new BadRequestException('Informe o nome do promoter');
    const event = await this.findEvent(clean(body.eventId));
    const eventTitle = clean(body.eventTitle) || clean(event?.name);
    return (this.prisma.astroPromoter as any).create({
      data: {
        protocol: makeProtocol('PRO'),
        adminUserId: user.sub,
        adminName: clean(user.name) || 'Administrador',
        adminEmail: clean(user.email),
        eventId: clean(body.eventId) || null,
        eventTitle: eventTitle || null,
        name,
        document: clean(body.document) || null,
        documentNormalized: normalizeDocument(body.document) || null,
        email: clean(body.email) || null,
        phone: clean(body.phone) || null,
        whatsapp: clean(body.whatsapp) || null,
        instagram: clean(body.instagram) || null,
        pixKey: clean(body.pixKey) || null,
        commissionType: clean(body.commissionType) || 'PERCENT',
        commissionValue: moneyNumber(body.commissionValue),
        commissionBase: clean(body.commissionBase) || 'NET_AMOUNT',
        status: 'ACTIVE',
        paymentStatus: 'PENDING',
        notes: clean(body.notes) || null,
      },
    });
  }

  async setPromoterStatus(user: AuthenticatedUser, id: string, body: SetCommercialStatusDto) {
    assertAdmin(user);
    const promoter = await (this.prisma.astroPromoter as any).findFirst({ where: { id, ...this.scopeWhere(user) } });
    if (!promoter) throw new NotFoundException('Promoter não encontrado');
    return (this.prisma.astroPromoter as any).update({ where: { id }, data: { status: normalizeCode(body.status) || 'ACTIVE' } });
  }

  async listCoupons(user: AuthenticatedUser) {
    assertAdmin(user);
    return (this.prisma.astroCoupon as any).findMany({ where: this.scopeWhere(user), include: { promoter: true, sales: true }, orderBy: { createdAt: 'desc' } });
  }

  async createCoupon(user: AuthenticatedUser, body: CreateCouponDto) {
    assertAdmin(user);
    const code = normalizeCode(body.code);
    if (!code) throw new BadRequestException('Informe o código do cupom');
    const duplicated = await (this.prisma.astroCoupon as any).findFirst({ where: { code, eventId: clean(body.eventId) || null, ...this.scopeWhere(user) } });
    if (duplicated) throw new BadRequestException('Já existe um cupom com este código para este evento');
    const event = await this.findEvent(clean(body.eventId));
    const eventTitle = clean(body.eventTitle) || clean(event?.name);
    return (this.prisma.astroCoupon as any).create({
      data: {
        protocol: makeProtocol('CUP'),
        adminUserId: user.sub,
        eventId: clean(body.eventId) || null,
        eventTitle: eventTitle || null,
        promoterId: clean(body.promoterId) || null,
        code,
        discountType: clean(body.discountType) || 'PERCENT',
        discountValue: moneyNumber(body.discountValue),
        usageLimit: integerNumber(body.usageLimit),
        perCpfLimit: integerNumber(body.perCpfLimit),
        startsAt: parseDate(body.startsAt),
        endsAt: parseDate(body.endsAt),
        validChannels: parseCsvJson(body.validChannels),
        status: 'ACTIVE',
        notes: clean(body.notes) || null,
      },
    });
  }

  async setCouponStatus(user: AuthenticatedUser, id: string, body: SetCommercialStatusDto) {
    assertAdmin(user);
    const coupon = await (this.prisma.astroCoupon as any).findFirst({ where: { id, ...this.scopeWhere(user) } });
    if (!coupon) throw new NotFoundException('Cupom não encontrado');
    return (this.prisma.astroCoupon as any).update({ where: { id }, data: { status: normalizeCode(body.status) || 'ACTIVE' } });
  }

  async listLinks(user: AuthenticatedUser) {
    assertAdmin(user);
    return (this.prisma.astroPromoterLink as any).findMany({ where: this.scopeWhere(user), include: { promoter: true, sales: true }, orderBy: { createdAt: 'desc' } });
  }

  async createLink(user: AuthenticatedUser, body: CreatePromoterLinkDto) {
    assertAdmin(user);
    const promoterId = clean(body.promoterId);
    if (!promoterId) throw new BadRequestException('Selecione o promoter para gerar o link');
    const promoter = await (this.prisma.astroPromoter as any).findFirst({ where: { id: promoterId, ...this.scopeWhere(user) } });
    if (!promoter) throw new NotFoundException('Promoter não encontrado');
    const event = await this.findEvent(clean(body.eventId) || clean(promoter.eventId));
    const eventTitle = clean(body.eventTitle) || clean(event?.name) || clean(promoter.eventTitle);
    const baseSlug = normalizeSlug(body.slug || `${promoter.name}-${eventTitle || 'evento'}`);
    let slug = baseSlug;
    let counter = 2;
    while (await (this.prisma.astroPromoterLink as any).findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }
    const url = clean(body.url) || `/eventos/${event?.slug || event?.id || clean(promoter.eventId) || 'evento'}?ref=${slug}`;
    return (this.prisma.astroPromoterLink as any).create({
      data: { protocol: makeProtocol('REF'), adminUserId: user.sub, eventId: clean(body.eventId) || clean(promoter.eventId) || null, eventTitle: eventTitle || null, promoterId, label: clean(body.label) || `Link de ${promoter.name}`, slug, url, status: 'ACTIVE', notes: clean(body.notes) || null },
    });
  }

  async registerClick(slug: string) {
    const link = await (this.prisma.astroPromoterLink as any).findUnique({ where: { slug } });
    if (!link) throw new NotFoundException('Link de promoter não encontrado');
    return (this.prisma.astroPromoterLink as any).update({ where: { id: link.id }, data: { clicks: { increment: 1 } } });
  }

  async listSales(user: AuthenticatedUser) {
    assertAdmin(user);
    return (this.prisma.astroPromoterSale as any).findMany({ where: this.scopeWhere(user), include: { promoter: true, coupon: true, link: true }, orderBy: { createdAt: 'desc' } });
  }

  async createManualSale(user: AuthenticatedUser, body: CreatePromoterSaleDto) {
    assertAdmin(user);
    const promoterId = clean(body.promoterId);
    const couponId = clean(body.couponId);
    const linkId = clean(body.linkId);
    const [promoter, coupon, link] = await Promise.all([
      promoterId ? (this.prisma.astroPromoter as any).findFirst({ where: { id: promoterId, ...this.scopeWhere(user) } }) : Promise.resolve(null),
      couponId ? (this.prisma.astroCoupon as any).findFirst({ where: { id: couponId, ...this.scopeWhere(user) } }) : Promise.resolve(null),
      linkId ? (this.prisma.astroPromoterLink as any).findFirst({ where: { id: linkId, ...this.scopeWhere(user) } }) : Promise.resolve(null),
    ]);
    if (promoterId && !promoter) throw new NotFoundException('Promoter não encontrado');
    if (couponId && !coupon) throw new NotFoundException('Cupom não encontrado');
    if (linkId && !link) throw new NotFoundException('Link não encontrado');
    const event = await this.findEvent(clean(body.eventId) || clean(promoter?.eventId) || clean(coupon?.eventId) || clean(link?.eventId));
    const eventTitle = clean(body.eventTitle) || clean(event?.name) || clean(promoter?.eventTitle) || clean(coupon?.eventTitle) || clean(link?.eventTitle);
    const grossAmount = moneyNumber(body.grossAmount);
    const discountAmount = moneyNumber(body.discountAmount);
    const netAmount = body.netAmount ? moneyNumber(body.netAmount) : Math.max(0, grossAmount - discountAmount);
    const status = normalizeCode(body.status || 'PAID');
    const commissionAmount = status === 'PAID' ? calculateCommission(promoter, { grossAmount, discountAmount, netAmount }) : 0;
    const sale = await (this.prisma.astroPromoterSale as any).create({
      data: { protocol: makeProtocol('VEN'), adminUserId: user.sub, eventId: clean(body.eventId) || clean(promoter?.eventId) || clean(coupon?.eventId) || clean(link?.eventId) || null, eventTitle: eventTitle || null, promoterId: promoterId || null, couponId: couponId || null, linkId: linkId || null, orderId: clean(body.orderId) || null, customerName: clean(body.customerName) || null, customerEmail: clean(body.customerEmail) || null, customerCpf: clean(body.customerCpf) || null, grossAmount, discountAmount, netAmount, commissionAmount, status, source: 'MANUAL', paidAt: status === 'PAID' ? new Date() : null, notes: clean(body.notes) || null },
    });
    if (couponId && status === 'PAID') await (this.prisma.astroCoupon as any).update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
    await this.syncLinkTotals(linkId);
    return sale;
  }

  async markCommissionPaid(user: AuthenticatedUser, promoterId: string, body: MarkPromoterCommissionPaidDto) {
    assertAdmin(user);
    const promoter = await (this.prisma.astroPromoter as any).findFirst({ where: { id: promoterId, ...this.scopeWhere(user) } });
    if (!promoter) throw new NotFoundException('Promoter não encontrado');
    return (this.prisma.astroPromoter as any).update({ where: { id: promoterId }, data: { paymentStatus: 'PAID', paymentNotes: clean(body.paymentNotes) || null, paymentProofName: clean(body.paymentProofName) || null, paymentProofDataUrl: clean(body.paymentProofDataUrl) || null, paymentPaidAt: new Date(), paymentPaidById: user.sub, paymentPaidByName: clean(user.name) || clean(user.email) || 'Administrador' } });
  }

  async reports(user: AuthenticatedUser) {
    assertAdmin(user);
    const [promoters, coupons, sales, links] = await Promise.all([this.listPromoters(user), this.listCoupons(user), this.listSales(user), this.listLinks(user)]);
    const paidSales = sales.filter((sale: any) => clean(sale.status) === 'PAID');
    const revenue = paidSales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.netAmount), 0);
    const commission = paidSales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.commissionAmount), 0);
    const promoterRanking = promoters.map((promoter: any) => {
      const promoterSales = paidSales.filter((sale: any) => sale.promoterId === promoter.id);
      const promoterRevenue = promoterSales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.netAmount), 0);
      const promoterCommission = promoterSales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.commissionAmount), 0);
      return { id: promoter.id, name: promoter.name, revenue: promoterRevenue, commission: promoterCommission, sales: promoterSales.length };
    }).sort((a: any, b: any) => b.revenue - a.revenue);
    const couponRanking = coupons.map((coupon: any) => {
      const couponSales = paidSales.filter((sale: any) => sale.couponId === coupon.id);
      const couponRevenue = couponSales.reduce((sum: number, sale: any) => sum + moneyNumber(sale.netAmount), 0);
      return { id: coupon.id, code: coupon.code, revenue: couponRevenue, sales: couponSales.length, usedCount: coupon.usedCount };
    }).sort((a: any, b: any) => b.sales - a.sales);
    return { revenue, commission, salesPaid: paidSales.length, promoters: promoters.length, coupons: coupons.length, links: links.length, promoterRanking, couponRanking };
  }
}

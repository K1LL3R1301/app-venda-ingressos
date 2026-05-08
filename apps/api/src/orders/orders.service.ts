import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CancelTicketDto } from './dto/cancel-ticket.dto';
import { CreateOrderDto } from './dto/create-order.dto';

type DbClient = Prisma.TransactionClient | PrismaService;

type BuiltTicketCreate = {
  code: string;
  eventSessionId: string | null;
  venueSectorId: string | null;
  seatMapObjectId: string | null;
  accessKind: string | null;
  accessLabel: string | null;
  accessMetadataJson: string | null;
  currentOwnerUserId: string | null;
  holderName: string | null;
  holderEmail: string | null;
  holderCpf: string | null;
  transferPlan?: {
    requestedByUserId: string;
    fromUserId: string;
    toUserId: string;
    requestedByName: string | null;
    requestedByEmail: string | null;
    requestedByCpf: string | null;
    fromName: string | null;
    fromEmail: string | null;
    fromCpf: string | null;
    toName: string | null;
    toEmail: string | null;
    toCpf: string | null;
  };
};

type PreparedOrderItem = {
  ticketTypeId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  eventSessionId: string | null;
  venueSectorId: string | null;
};


type NormalizedPlaceSelection = {
  id: string;
  ticketTypeId: string;
  eventSessionId: string | null;
  venueSectorId: string | null;
  seatMapObjectId: string | null;
  kind: 'SEAT' | 'TABLE_CHAIR' | 'TABLE_FULL';
  label: string | null;
  quantity: number;
  amount: Prisma.Decimal;
  chairCount: number | null;
  physicalKey: string;
  subTicketsJson: string | null;
};

type RawPlaceReservationRow = {
  id: string;
  kind: string;
  quantity: number;
  chairCount: number | null;
  status: string;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private orderInclude = {
    event: {
      include: {
        media: true,
      },
    },
    items: {
      include: {
        ticketType: true,
        tickets: true,
      },
    },
    payments: true,
    cancellations: true,
    transferRequests: true,
  } as const;

  private normalizeCpf(value?: string | null) {
    return String(value || '').replace(/\D/g, '');
  }

  private normalizeEmail(value?: string | null) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized || null;
  }

  private getPendingOrderExpiresAt() {
    return new Date(Date.now() + 10 * 60 * 1000);
  }

  private getTransferAcceptanceExpiresAt() {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  private countRequestedTickets(data: CreateOrderDto) {
    return data.items.reduce((sum, item) => sum + item.quantity, 0);
  }

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

  private isOrderExpired(order: {
    status?: string | null;
    expiresAt?: Date | string | null;
  }) {
    const status = String(order.status || '').toUpperCase();

    if (status !== 'PENDING' && status !== 'PENDING_PAYMENT') {
      return false;
    }

    if (!order.expiresAt) {
      return false;
    }

    const expiresAt = new Date(order.expiresAt).getTime();

    if (Number.isNaN(expiresAt)) {
      return false;
    }

    return expiresAt < Date.now();
  }

  private async findUserByCpfOrEmail(
    params: {
      cpf?: string | null;
      email?: string | null;
    },
    db: DbClient = this.prisma,
  ): Promise<User | null> {
    const normalizedCpf = this.normalizeCpf(params.cpf);
    const normalizedEmail = this.normalizeEmail(params.email);

    if (normalizedCpf) {
      const userByCpf = await db.user.findUnique({
        where: { cpfNormalized: normalizedCpf },
      });

      if (userByCpf) {
        return userByCpf;
      }
    }

    if (normalizedEmail) {
      const userByEmail = await db.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (userByEmail) {
        return userByEmail;
      }
    }

    return null;
  }

  private async getEventCpfLimit(eventId: string, db: DbClient = this.prisma) {
    const ticketTypes = await db.ticketType.findMany({
      where: { eventId },
      select: { maxPerOrder: true },
    });

    const configuredLimits = ticketTypes
      .map((ticketType) => Number(ticketType.maxPerOrder || 0))
      .filter((limit) => Number.isFinite(limit) && limit > 0);

    if (configuredLimits.length === 0) {
      return 4;
    }

    return Math.max(1, Math.min(...configuredLimits));
  }

  private async countTicketsByCpfForEvent(
    eventId: string,
    cpf: string,
    db: DbClient = this.prisma,
  ) {
    const normalizedCpf = this.normalizeCpf(cpf);

    if (!normalizedCpf) {
      return 0;
    }

    const rows = await db.$queryRawUnsafe<Array<{ total: bigint | number | string | null }>>(
      `SELECT COALESCE(SUM(
          CASE
            WHEN grouped."accessKind" = 'TABLE_FULL_ACCESS' THEN 1
            ELSE grouped."ticketCount"
          END
        ), 0) AS "total"
        FROM (
          SELECT
            t."orderItemId",
            COALESCE(t."accessKind", 'COMMON') AS "accessKind",
            COUNT(*) AS "ticketCount"
          FROM "Ticket" t
          INNER JOIN "OrderItem" oi ON oi."id" = t."orderItemId"
          INNER JOIN "TicketType" tt ON tt."id" = oi."ticketTypeId"
          INNER JOIN "Order" o ON o."id" = oi."orderId"
          WHERE tt."eventId" = $1
            AND t."holderCpf" = $2
            AND t."status" <> 'CANCELED'
            AND o."status" <> 'CANCELED'
          GROUP BY t."orderItemId", COALESCE(t."accessKind", 'COMMON')
        ) grouped`,
      eventId,
      normalizedCpf,
    );

    const rawTotal = rows[0]?.total || 0;
    return Number(rawTotal);
  }

  private async ensureCpfLimitForEvent(params: {
    eventId: string;
    requestedByCpf: Map<string, number>;
    db?: DbClient;
  }) {
    const db = params.db || this.prisma;
    const limit = await this.getEventCpfLimit(params.eventId, db);

    for (const [cpf, requestedQuantity] of params.requestedByCpf.entries()) {
      if (!cpf) {
        continue;
      }

      const currentQuantity = await this.countTicketsByCpfForEvent(
        params.eventId,
        cpf,
        db,
      );

      if (currentQuantity + requestedQuantity > limit) {
        throw new BadRequestException(
          `O CPF ${cpf} ja possui ${currentQuantity} ingresso(s) neste evento. O limite definido pelo produtor e ${limit} ingresso(s) por CPF no evento inteiro.`,
        );
      }
    }
  }

  private addCpfCount(map: Map<string, number>, cpf?: string | null) {
    const normalizedCpf = this.normalizeCpf(cpf);

    if (!normalizedCpf) {
      return;
    }

    map.set(normalizedCpf, (map.get(normalizedCpf) || 0) + 1);
  }

  private normalizePlaceKind(value?: string | null): 'SEAT' | 'TABLE_CHAIR' | 'TABLE_FULL' {
    const normalized = String(value || '').trim().toUpperCase();

    if (normalized === 'TABLE_FULL') return 'TABLE_FULL';
    if (normalized === 'TABLE_CHAIR') return 'TABLE_CHAIR';

    return 'SEAT';
  }

  private getPlacePhysicalKey(selectionId: string, kind: string) {
    const rawId = String(selectionId || '').trim();

    if (!rawId) {
      return '';
    }

    if (kind === 'TABLE_FULL') {
      return rawId.replace(/:full$/i, '');
    }

    if (kind === 'TABLE_CHAIR') {
      return rawId.replace(/:chairmix:[^:]+$/i, '').replace(/:chair:[^:]+$/i, '');
    }

    return rawId;
  }

  private getPlaceCpfLimitQuantity(selection: NormalizedPlaceSelection) {
    if (selection.kind === 'TABLE_FULL') return 1;

    return Math.max(1, Number(selection.quantity || 1));
  }

  private normalizePlaceSelections(data: CreateOrderDto) {
    return (data.placeSelections || [])
      .map((selection) => {
        const id = String(selection.id || '').trim();
        const ticketTypeId = String(selection.ticketTypeId || '').trim();
        const kind = this.normalizePlaceKind(selection.kind);
        const physicalKey = this.getPlacePhysicalKey(id, kind);
        const rawSubTickets = Array.isArray(selection.subTickets)
          ? selection.subTickets
          : [];
        const amountFromSubTickets = rawSubTickets.reduce((sum, subTicket) => {
          const unitAmount = Number(subTicket.unitAmount || 0);
          const quantity = Math.max(0, Number(subTicket.quantity || 0));
          return sum + unitAmount * quantity;
        }, 0);
        const amountNumber = Number(selection.amount || amountFromSubTickets || 0);
        const quantity =
          kind === 'TABLE_FULL'
            ? 1
            : Math.max(1, Number(selection.quantity || 1));
        const chairCount = Number(selection.chairCount || 0);

        if (!id || !ticketTypeId || !physicalKey) {
          return null;
        }

        return {
          id,
          ticketTypeId,
          eventSessionId: selection.sessionId || null,
          venueSectorId: selection.sectorId || null,
          seatMapObjectId: selection.objectId || null,
          kind,
          label: String(selection.label || '').trim() || null,
          quantity,
          amount: new Prisma.Decimal(Number.isFinite(amountNumber) ? amountNumber : 0),
          chairCount: chairCount > 0 ? chairCount : null,
          physicalKey,
          subTicketsJson: rawSubTickets.length > 0 ? JSON.stringify(rawSubTickets) : null,
        } satisfies NormalizedPlaceSelection;
      })
      .filter(Boolean) as NormalizedPlaceSelection[];
  }

  private getPlaceTotalsByTicketType(data: CreateOrderDto) {
    const totals = new Map<
      string,
      {
        quantity: number;
        amount: Prisma.Decimal;
      }
    >();

    for (const selection of this.normalizePlaceSelections(data)) {
      const current = totals.get(selection.ticketTypeId) || {
        quantity: 0,
        amount: new Prisma.Decimal(0),
      };

      current.quantity += this.getPlaceCpfLimitQuantity(selection);
      current.amount = current.amount.add(selection.amount);
      totals.set(selection.ticketTypeId, current);
    }

    return totals;
  }

  private async expireOldPlaceReservations(db: Prisma.TransactionClient) {
    await db.$executeRawUnsafe(
      `UPDATE "PlaceReservation"
          SET "status" = 'EXPIRED', "updatedAt" = NOW()
        WHERE "status" = 'HELD'
          AND "expiresAt" IS NOT NULL
          AND "expiresAt" < NOW()`,
    );
  }

  private async lockPlaceKey(db: Prisma.TransactionClient, key: string) {
    await db.$executeRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      key,
    );
  }

  private async getActivePlaceReservations(
    db: Prisma.TransactionClient,
    params: {
      eventId: string;
      eventSessionId: string | null;
      venueSectorId: string | null;
      physicalKey: string;
    },
  ) {
    return db.$queryRawUnsafe<RawPlaceReservationRow[]>(
      `SELECT "id", "kind", "quantity", "chairCount", "status"
         FROM "PlaceReservation"
        WHERE "eventId" = $1
          AND COALESCE("eventSessionId", '') = COALESCE($2, '')
          AND COALESCE("venueSectorId", '') = COALESCE($3, '')
          AND "physicalKey" = $4
          AND (
            "status" = 'SOLD'
            OR ("status" = 'HELD' AND ("expiresAt" IS NULL OR "expiresAt" > NOW()))
          )`,
      params.eventId,
      params.eventSessionId,
      params.venueSectorId,
      params.physicalKey,
    );
  }

  private async reserveOrderPlaces(params: {
    data: CreateOrderDto;
    orderId: string;
    userId?: string | null;
    status: 'HELD' | 'SOLD';
    expiresAt?: Date | null;
    db: Prisma.TransactionClient;
  }) {
    const selections = this.normalizePlaceSelections(params.data);

    if (selections.length === 0) {
      return;
    }

    await this.expireOldPlaceReservations(params.db);

    for (const selection of selections) {
      const lockKey = [
        params.data.eventId,
        selection.eventSessionId || '',
        selection.venueSectorId || '',
        selection.physicalKey,
      ].join('|');

      await this.lockPlaceKey(params.db, lockKey);

      const activeReservations = await this.getActivePlaceReservations(params.db, {
        eventId: params.data.eventId,
        eventSessionId: selection.eventSessionId,
        venueSectorId: selection.venueSectorId,
        physicalKey: selection.physicalKey,
      });

      const hasFullTable = activeReservations.some(
        (reservation) => reservation.kind === 'TABLE_FULL',
      );
      const usedChairs = activeReservations
        .filter((reservation) => reservation.kind !== 'TABLE_FULL')
        .reduce((sum, reservation) => sum + Number(reservation.quantity || 0), 0);

      if (selection.kind === 'TABLE_FULL' && activeReservations.length > 0) {
        throw new BadRequestException(
          `A ${selection.label || 'mesa'} ja esta reservada ou vendida. Escolha outro lugar.`,
        );
      }

      if (selection.kind === 'TABLE_CHAIR') {
        if (hasFullTable) {
          throw new BadRequestException(
            `A ${selection.label || 'mesa'} ja foi comprada inteira. Escolha outro lugar.`,
          );
        }

        const chairCount = selection.chairCount || 0;

        if (chairCount > 0 && usedChairs + selection.quantity > chairCount) {
          throw new BadRequestException(
            `A ${selection.label || 'mesa'} tem apenas ${Math.max(
              0,
              chairCount - usedChairs,
            )} lugar(es) livre(s).`,
          );
        }
      }

      if (selection.kind === 'SEAT' && activeReservations.length > 0) {
        throw new BadRequestException(
          `O lugar ${selection.label || selection.id} ja esta reservado ou vendido.`,
        );
      }

      await params.db.$executeRawUnsafe(
        `INSERT INTO "PlaceReservation" (
          "id", "eventId", "eventSessionId", "venueSectorId", "seatMapObjectId",
          "ticketTypeId", "orderId", "userId", "placeKey", "physicalKey", "kind",
          "label", "quantity", "chairCount", "subTickets", "amount", "status",
          "expiresAt", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, CAST($15 AS jsonb), $16, $17,
          $18, NOW(), NOW()
        )`,
        crypto.randomUUID(),
        params.data.eventId,
        selection.eventSessionId,
        selection.venueSectorId,
        selection.seatMapObjectId,
        selection.ticketTypeId,
        params.orderId,
        params.userId || null,
        selection.id,
        selection.physicalKey,
        selection.kind,
        selection.label,
        selection.quantity,
        selection.chairCount,
        selection.subTicketsJson,
        selection.amount,
        params.status,
        params.status === 'SOLD' ? null : params.expiresAt || null,
      );
    }
  }

  private async updateOrderPlaceReservationsStatus(
    orderId: string,
    status: 'SOLD' | 'CANCELED' | 'EXPIRED',
    db: Prisma.TransactionClient,
    ticketTypeId?: string | null,
  ) {
    if (ticketTypeId) {
      await db.$executeRawUnsafe(
        `UPDATE "PlaceReservation"
            SET "status" = $1,
                "expiresAt" = CASE WHEN $1 = 'SOLD' THEN NULL ELSE "expiresAt" END,
                "updatedAt" = NOW()
          WHERE "orderId" = $2
            AND "ticketTypeId" = $3
            AND "status" IN ('HELD', 'SOLD')`,
        status,
        orderId,
        ticketTypeId,
      );
      return;
    }

    await db.$executeRawUnsafe(
      `UPDATE "PlaceReservation"
          SET "status" = $1,
              "expiresAt" = CASE WHEN $1 = 'SOLD' THEN NULL ELSE "expiresAt" END,
              "updatedAt" = NOW()
        WHERE "orderId" = $2
          AND "status" IN ('HELD', 'SOLD')`,
      status,
      orderId,
    );
  }

  private async prepareOrderItems(data: CreateOrderDto, db: DbClient = this.prisma) {
    const event = await db.event.findUnique({
      where: { id: data.eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento nao encontrado');
    }

    let totalAmount = new Prisma.Decimal(0);
    const itemsData: PreparedOrderItem[] = [];
    const placeTotalsByTicketType = this.getPlaceTotalsByTicketType(data);

    for (const item of data.items) {
      const ticketType = await db.ticketType.findUnique({
        where: { id: item.ticketTypeId },
      });

      if (!ticketType) {
        throw new NotFoundException(
          `Tipo de ingresso nao encontrado: ${item.ticketTypeId}`,
        );
      }

      if (ticketType.eventId !== data.eventId) {
        throw new BadRequestException(
          `O ingresso ${ticketType.name} nao pertence ao evento selecionado`,
        );
      }

      if (ticketType.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Tipo de ingresso inativo: ${ticketType.name}`,
        );
      }

      if (item.quantity > ticketType.quantity) {
        throw new BadRequestException(
          `Quantidade indisponivel para ${ticketType.name}. Disponivel: ${ticketType.quantity}`,
        );
      }

      if (item.holders?.length && item.holders.length !== item.quantity) {
        throw new BadRequestException(
          `O item ${ticketType.name} precisa ter exatamente ${item.quantity} titular(es) informado(s)`,
        );
      }

      const unitPriceFromTicketType = new Prisma.Decimal(ticketType.price);
      const placeTotal = placeTotalsByTicketType.get(item.ticketTypeId) || {
        quantity: 0,
        amount: new Prisma.Decimal(0),
      };

      if (placeTotal.quantity > item.quantity) {
        throw new BadRequestException(
          `A quantidade de lugares selecionados para ${ticketType.name} e maior do que a quantidade do carrinho`,
        );
      }

      const commonQuantity = Math.max(0, item.quantity - placeTotal.quantity);
      const commonTotalPrice = unitPriceFromTicketType.mul(commonQuantity);
      const totalPrice = placeTotal.amount.add(commonTotalPrice);
      const unitPrice = item.quantity > 0 ? totalPrice.div(item.quantity) : unitPriceFromTicketType;

      totalAmount = totalAmount.add(totalPrice);

      itemsData.push({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        eventSessionId: ticketType.eventSessionId || null,
        venueSectorId: ticketType.venueSectorId || null,
      });
    }

    return {
      event,
      itemsData,
      totalAmount,
    };
  }

  private async getWalletBalance(userId: string, db: DbClient = this.prisma) {
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


  private parsePlaceSubTickets(selection: NormalizedPlaceSelection) {
    if (!selection.subTicketsJson) {
      return [] as Array<{
        ticketTypeId: string;
        kind: string;
        label: string;
        quantity: number;
        unitAmount: number;
      }>;
    }

    try {
      const parsed = JSON.parse(selection.subTicketsJson) as Array<{
        ticketTypeId?: string;
        kind?: string;
        label?: string;
        quantity?: number;
        unitAmount?: number;
      }>;

      return (Array.isArray(parsed) ? parsed : [])
        .map((item) => ({
          ticketTypeId: String(item.ticketTypeId || selection.ticketTypeId),
          kind: String(item.kind || item.label || 'INTEIRA').toUpperCase(),
          label: String(item.label || item.kind || 'Inteira'),
          quantity: Math.max(0, Number(item.quantity || 0)),
          unitAmount: Number(item.unitAmount || 0),
        }))
        .filter((item) => item.quantity > 0);
    } catch {
      return [];
    }
  }

  private expandSelectionAccessTickets(selection: NormalizedPlaceSelection) {
    const subTickets = this.parsePlaceSubTickets(selection);
    const expanded: Array<{
      chairIndex: number;
      chairLabel: string;
      ticketKind: string;
      ticketKindLabel: string;
      ticketTypeId: string;
      unitAmount: number;
    }> = [];

    if (subTickets.length > 0) {
      for (const subTicket of subTickets) {
        for (let index = 0; index < subTicket.quantity; index += 1) {
          expanded.push({
            chairIndex: expanded.length + 1,
            chairLabel: `C${expanded.length + 1}`,
            ticketKind: subTicket.kind,
            ticketKindLabel: subTicket.label,
            ticketTypeId: subTicket.ticketTypeId,
            unitAmount: subTicket.unitAmount,
          });
        }
      }
    }

    if (expanded.length === 0) {
      const quantity = selection.kind === 'TABLE_FULL'
        ? selection.chairCount || selection.quantity
        : selection.quantity;

      for (let index = 0; index < quantity; index += 1) {
        expanded.push({
          chairIndex: expanded.length + 1,
          chairLabel: `C${expanded.length + 1}`,
          ticketKind: 'INTEIRA',
          ticketKindLabel: 'Inteira',
          ticketTypeId: selection.ticketTypeId,
          unitAmount: Number(selection.amount || 0),
        });
      }
    }

    return expanded;
  }

  private async insertOrderTickets(
    orderItems: Array<{ id: string; ticketTypeId: string }>,
    ticketPlans: BuiltTicketCreate[][],
    db: Prisma.TransactionClient,
  ) {
    if (orderItems.length !== ticketPlans.length) {
      throw new BadRequestException(
        'Nao foi possivel montar os QR Codes do pedido. Tente novamente.',
      );
    }

    for (let itemIndex = 0; itemIndex < orderItems.length; itemIndex += 1) {
      const orderItem = orderItems[itemIndex];
      const tickets = ticketPlans[itemIndex] || [];

      for (const ticket of tickets) {
        await db.$executeRawUnsafe(
          `INSERT INTO "Ticket" (
            "id", "orderItemId", "eventSessionId", "venueSectorId", "seatMapObjectId",
            "currentOwnerUserId", "code", "status", "holderName", "holderEmail", "holderCpf",
            "accessKind", "accessLabel", "accessMetadata", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11,
            $12, $13, CAST($14 AS jsonb), NOW(), NOW()
          )`,
          crypto.randomUUID(),
          orderItem.id,
          ticket.eventSessionId,
          ticket.venueSectorId,
          ticket.seatMapObjectId,
          ticket.currentOwnerUserId,
          ticket.code,
          'AVAILABLE',
          ticket.holderName,
          ticket.holderEmail,
          ticket.holderCpf,
          ticket.accessKind,
          ticket.accessLabel,
          ticket.accessMetadataJson,
        );
      }
    }
  }

  private async buildTicketCreates(
    data: CreateOrderDto,
    itemsData: PreparedOrderItem[],
    db: DbClient,
    purchaserUserId?: string | null,
  ) {
    let purchaserUser: User | null = null;

    if (purchaserUserId) {
      purchaserUser = await db.user.findUnique({
        where: { id: purchaserUserId },
      });
    }

    if (!purchaserUser) {
      purchaserUser = await this.findUserByCpfOrEmail(
        {
          cpf: data.customerCpf,
          email: data.customerEmail,
        },
        db,
      );
    }

    const defaultHolderName = purchaserUser?.name || data.customerName;
    const defaultHolderEmail =
      purchaserUser?.email || this.normalizeEmail(data.customerEmail);
    const defaultHolderCpf =
      purchaserUser?.cpfNormalized || this.normalizeCpf(data.customerCpf);
    const defaultOwnerUserId = purchaserUser?.id || null;
    const requestedByCpf = new Map<string, number>();
    const ticketsByItem: BuiltTicketCreate[][] = [];

    const placeSelectionsByTicketType = new Map<string, NormalizedPlaceSelection[]>();

    for (const selection of this.normalizePlaceSelections(data)) {
      const current = placeSelectionsByTicketType.get(selection.ticketTypeId) || [];
      current.push(selection);
      placeSelectionsByTicketType.set(selection.ticketTypeId, current);
    }

    const buildTicket = async (params: {
      item: CreateOrderDto['items'][number];
      preparedItem: PreparedOrderItem;
      holderIndex: number;
      countForCpfLimit: boolean;
      seatMapObjectId?: string | null;
      accessKind?: string | null;
      accessLabel?: string | null;
      accessMetadata?: Record<string, unknown> | null;
    }): Promise<BuiltTicketCreate> => {
      const holder = params.item.holders?.[params.holderIndex] || params.item.holders?.[0];
      const holderName = String(holder?.name || '').trim() || null;
      const holderEmail = this.normalizeEmail(holder?.email);
      const holderCpf = this.normalizeCpf(holder?.cpf);
      const resolvedHolderCpf = holderCpf || defaultHolderCpf || null;
      const resolvedHolderEmail = holderEmail || defaultHolderEmail || null;
      let targetUser: User | null = null;

      if (holderCpf || holderEmail) {
        targetUser = await this.findUserByCpfOrEmail(
          {
            cpf: holderCpf,
            email: holderEmail,
          },
          db,
        );
      }

      const isTransferToAnotherUser =
        !!targetUser &&
        !!defaultOwnerUserId &&
        targetUser.id !== defaultOwnerUserId;

      if (isTransferToAnotherUser && !purchaserUser) {
        throw new BadRequestException(
          'O comprador precisa possuir conta cadastrada para enviar ingresso para outra pessoa',
        );
      }

      if (params.countForCpfLimit) {
        this.addCpfCount(
          requestedByCpf,
          targetUser?.cpfNormalized || resolvedHolderCpf || defaultHolderCpf,
        );
      }

      return {
        code: crypto.randomUUID(),
        eventSessionId: params.preparedItem.eventSessionId,
        venueSectorId: params.preparedItem.venueSectorId,
        seatMapObjectId: params.seatMapObjectId || null,
        accessKind: params.accessKind || null,
        accessLabel: params.accessLabel || null,
        accessMetadataJson: params.accessMetadata
          ? JSON.stringify(params.accessMetadata)
          : null,
        currentOwnerUserId: defaultOwnerUserId,
        holderName: targetUser?.name || holderName || defaultHolderName || null,
        holderEmail: targetUser?.email || resolvedHolderEmail || null,
        holderCpf: targetUser?.cpfNormalized || resolvedHolderCpf || null,
        transferPlan:
          isTransferToAnotherUser && purchaserUser && targetUser
            ? {
                requestedByUserId: purchaserUser.id,
                fromUserId: purchaserUser.id,
                toUserId: targetUser.id,
                requestedByName: purchaserUser.name || null,
                requestedByEmail: purchaserUser.email || null,
                requestedByCpf: purchaserUser.cpfNormalized || null,
                fromName: purchaserUser.name || null,
                fromEmail: purchaserUser.email || null,
                fromCpf: purchaserUser.cpfNormalized || null,
                toName: targetUser.name || null,
                toEmail: targetUser.email || null,
                toCpf: targetUser.cpfNormalized || null,
              }
            : undefined,
      };
    };

    for (let itemIndex = 0; itemIndex < data.items.length; itemIndex += 1) {
      const item = data.items[itemIndex];
      const preparedItem = itemsData[itemIndex];
      const itemTickets: BuiltTicketCreate[] = [];
      const relatedSelections = placeSelectionsByTicketType.get(item.ticketTypeId) || [];
      let holderCursor = 0;
      let commercialQuantityCoveredByPlaces = 0;

      for (const selection of relatedSelections) {
        if (selection.kind === 'TABLE_FULL') {
          const accessTickets = this.expandSelectionAccessTickets(selection);
          const expectedChairCount = selection.chairCount || accessTickets.length;

          if (accessTickets.length !== expectedChairCount) {
            throw new BadRequestException(
              `Distribua todos os ${expectedChairCount} lugares da ${selection.label || 'mesa'} entre Inteira, Meia e Social antes de finalizar.`,
            );
          }

          for (const accessTicket of accessTickets) {
            itemTickets.push(
              await buildTicket({
                item,
                preparedItem,
                holderIndex: holderCursor,
                countForCpfLimit: accessTicket.chairIndex === 1,
                seatMapObjectId: selection.seatMapObjectId,
                accessKind: 'TABLE_FULL_ACCESS',
                accessLabel: `${selection.label || 'Mesa'} - ${accessTicket.chairLabel} - ${accessTicket.ticketKindLabel}`,
                accessMetadata: {
                  placeId: selection.id,
                  physicalKey: selection.physicalKey,
                  placeKind: selection.kind,
                  label: selection.label,
                  chairCount: expectedChairCount,
                  chairIndex: accessTicket.chairIndex,
                  chairLabel: accessTicket.chairLabel,
                  ticketKind: accessTicket.ticketKind,
                  ticketKindLabel: accessTicket.ticketKindLabel,
                  ticketTypeId: accessTicket.ticketTypeId,
                  unitAmount: accessTicket.unitAmount,
                  commercialQuantity: 1,
                },
              }),
            );
          }

          holderCursor += 1;
          commercialQuantityCoveredByPlaces += 1;
          continue;
        }

        const accessTickets = this.expandSelectionAccessTickets(selection).slice(
          0,
          selection.quantity,
        );

        for (let accessIndex = 0; accessIndex < accessTickets.length; accessIndex += 1) {
          const accessTicket = accessTickets[accessIndex];
          itemTickets.push(
            await buildTicket({
              item,
              preparedItem,
              holderIndex: holderCursor + accessIndex,
              countForCpfLimit: true,
              seatMapObjectId: selection.seatMapObjectId,
              accessKind: selection.kind === 'TABLE_CHAIR' ? 'TABLE_CHAIR_ACCESS' : 'SEAT_ACCESS',
              accessLabel: `${selection.label || 'Lugar'} - ${accessTicket.chairLabel} - ${accessTicket.ticketKindLabel}`,
              accessMetadata: {
                placeId: selection.id,
                physicalKey: selection.physicalKey,
                placeKind: selection.kind,
                label: selection.label,
                chairCount: selection.chairCount,
                chairIndex: accessTicket.chairIndex,
                chairLabel: accessTicket.chairLabel,
                ticketKind: accessTicket.ticketKind,
                ticketKindLabel: accessTicket.ticketKindLabel,
                ticketTypeId: accessTicket.ticketTypeId,
                unitAmount: accessTicket.unitAmount,
                commercialQuantity: 1,
              },
            }),
          );
        }

        holderCursor += selection.quantity;
        commercialQuantityCoveredByPlaces += selection.quantity;
      }

      const commonQuantity = Math.max(0, item.quantity - commercialQuantityCoveredByPlaces);

      for (let index = 0; index < commonQuantity; index += 1) {
        itemTickets.push(
          await buildTicket({
            item,
            preparedItem,
            holderIndex: holderCursor + index,
            countForCpfLimit: true,
          }),
        );
      }

      ticketsByItem.push(itemTickets);
    }

    await this.ensureCpfLimitForEvent({
      eventId: data.eventId,
      requestedByCpf,
      db,
    });

    return {
      purchaserUser,
      ticketsByItem,
    };
  }

  private async createTransferRequestsForOrder(
    orderId: string,
    ticketPlans: BuiltTicketCreate[][],
    db: Prisma.TransactionClient,
    pendingPaymentExpiresAt?: Date | null,
  ) {
    const tickets = ticketPlans.flat();
    const transferPlansByCode = new Map(
      tickets
        .filter((ticket) => ticket.transferPlan)
        .map((ticket) => [ticket.code, ticket.transferPlan!]),
    );

    if (transferPlansByCode.size === 0) {
      return;
    }

    const createdOrder = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            tickets: true,
          },
        },
      },
    });

    if (!createdOrder) {
      throw new NotFoundException('Pedido nao encontrado apos criacao');
    }

    for (const item of createdOrder.items) {
      for (const ticket of item.tickets) {
        const transferPlan = transferPlansByCode.get(ticket.code);

        if (!transferPlan) {
          continue;
        }

        await db.ticketTransferRequest.create({
          data: {
            ticketId: ticket.id,
            orderId: createdOrder.id,
            requestedByUserId: transferPlan.requestedByUserId,
            fromUserId: transferPlan.fromUserId,
            toUserId: transferPlan.toUserId,
            requestedByName: transferPlan.requestedByName,
            requestedByEmail: transferPlan.requestedByEmail,
            requestedByCpf: transferPlan.requestedByCpf,
            fromName: transferPlan.fromName,
            fromEmail: transferPlan.fromEmail,
            fromCpf: transferPlan.fromCpf,
            toName: transferPlan.toName,
            toEmail: transferPlan.toEmail,
            toCpf: transferPlan.toCpf,
            status: 'PENDING_PAYMENT',
            expiresAt: pendingPaymentExpiresAt || null,
          },
        });
      }
    }
  }

  private async activateOrderTransferRequests(
    orderId: string,
    db: Prisma.TransactionClient,
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

    const acceptanceExpiresAt = this.getTransferAcceptanceExpiresAt();

    await db.ticketTransferRequest.updateMany({
      where: {
        id: {
          in: pendingTransfers.map((item) => item.id),
        },
      },
      data: {
        status: 'PENDING_ACCEPTANCE',
        expiresAt: acceptanceExpiresAt,
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

  private async expireOrderNow(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            tickets: true,
          },
        },
        payments: true,
      },
    });

    if (!order || !this.isOrderExpired(order)) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const freshOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              tickets: true,
            },
          },
        },
      });

      if (!freshOrder || !this.isOrderExpired(freshOrder)) {
        return;
      }

      for (const item of freshOrder.items) {
        const restockableTickets = item.tickets.filter(
          (ticket) => ticket.status !== 'CANCELED',
        );

        if (restockableTickets.length > 0) {
          await tx.ticket.updateMany({
            where: {
              id: {
                in: restockableTickets.map((ticket) => ticket.id),
              },
            },
            data: {
              status: 'CANCELED',
            },
          });

          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      await tx.ticketTransferRequest.updateMany({
        where: {
          orderId: freshOrder.id,
          status: {
            in: ['PENDING_PAYMENT', 'PENDING_ACCEPTANCE'],
          },
        },
        data: {
          status: 'CANCELED',
          respondedAt: new Date(),
          responseReason: 'Pedido expirado automaticamente',
        },
      });

      await this.updateOrderPlaceReservationsStatus(freshOrder.id, 'EXPIRED', tx);

      await tx.order.update({
        where: { id: freshOrder.id },
        data: {
          status: 'CANCELED',
          totalAmount: new Prisma.Decimal(0),
          expiresAt: null,
        },
      });
    });
  }

  private async expirePendingOrders(where?: Prisma.OrderWhereInput) {
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING', 'PENDING_PAYMENT'],
        },
        expiresAt: {
          lt: new Date(),
        },
        ...(where || {}),
      },
      select: {
        id: true,
      },
    });

    for (const order of expiredOrders) {
      await this.expireOrderNow(order.id);
    }
  }

  async create(data: CreateOrderDto) {
    const normalizedCustomerEmail = this.normalizeEmail(data.customerEmail);

    if (!normalizedCustomerEmail) {
      throw new BadRequestException('Email do comprador e obrigatorio');
    }

    const normalizedCustomerCpf = this.normalizeCpf(data.customerCpf);

    const mergedData: CreateOrderDto = {
      ...data,
      customerEmail: normalizedCustomerEmail,
      customerCpf: normalizedCustomerCpf || undefined,
    };

    const { itemsData, totalAmount } = await this.prepareOrderItems(mergedData);
    const pendingExpiresAt = this.getPendingOrderExpiresAt();

    return this.prisma.$transaction(async (tx) => {
      const { purchaserUser, ticketsByItem } = await this.buildTicketCreates(
        mergedData,
        itemsData,
        tx,
        null,
      );

      const order = await tx.order.create({
        data: {
          eventId: mergedData.eventId,
          customerUserId: purchaserUser?.id || null,
          customerName: mergedData.customerName,
          customerEmail: normalizedCustomerEmail,
          customerCpf:
            purchaserUser?.cpfNormalized || normalizedCustomerCpf || null,
          totalAmount,
          status: 'PENDING',
          expiresAt: pendingExpiresAt,
          items: {
            create: itemsData.map((item) => ({
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      await this.insertOrderTickets(order.items, ticketsByItem, tx);

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

      await this.reserveOrderPlaces({
        data: mergedData,
        orderId: order.id,
        userId: purchaserUser?.id || null,
        status: 'HELD',
        expiresAt: pendingExpiresAt,
        db: tx,
      });

      await this.createTransferRequestsForOrder(
        order.id,
        ticketsByItem,
        tx,
        pendingExpiresAt,
      );

      return tx.order.findUnique({
        where: { id: order.id },
        include: this.orderInclude,
      });
    });
  }

  async createCustomerOrder(
    userId: string,
    customerEmail: string,
    data: CreateOrderDto,
  ) {
    const normalizedCustomerEmail = this.normalizeEmail(customerEmail);

    if (!normalizedCustomerEmail) {
      throw new BadRequestException('Email do comprador e obrigatorio');
    }

    const purchaserUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!purchaserUser) {
      throw new NotFoundException('Usuario comprador nao encontrado');
    }

    const mergedData: CreateOrderDto = {
      ...data,
      customerEmail: normalizedCustomerEmail,
      customerCpf: purchaserUser.cpfNormalized || undefined,
    };

    const { itemsData, totalAmount } = await this.prepareOrderItems(mergedData);
    const walletBalance = mergedData.useWalletBalance
      ? await this.getWalletBalance(userId)
      : new Prisma.Decimal(0);
    const walletAppliedAmount = totalAmount.gt(walletBalance)
      ? walletBalance
      : totalAmount;
    const remainingAmount = totalAmount.sub(walletAppliedAmount);
    const orderStatus = remainingAmount.lte(0) ? 'PAID' : 'PENDING';
    const pendingExpiresAt =
      orderStatus === 'PAID' ? null : this.getPendingOrderExpiresAt();

    return this.prisma.$transaction(async (tx) => {
      const { ticketsByItem } = await this.buildTicketCreates(
        mergedData,
        itemsData,
        tx,
        userId,
      );

      const order = await tx.order.create({
        data: {
          eventId: mergedData.eventId,
          customerUserId: purchaserUser.id,
          customerName: purchaserUser.name || mergedData.customerName,
          customerEmail: normalizedCustomerEmail,
          customerCpf: purchaserUser.cpfNormalized || null,
          totalAmount,
          status: orderStatus,
          expiresAt: pendingExpiresAt,
          items: {
            create: itemsData.map((item) => ({
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      await this.insertOrderTickets(order.items, ticketsByItem, tx);

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

      await this.reserveOrderPlaces({
        data: mergedData,
        orderId: order.id,
        userId,
        status: orderStatus === 'PAID' ? 'SOLD' : 'HELD',
        expiresAt: pendingExpiresAt,
        db: tx,
      });

      await this.createTransferRequestsForOrder(
        order.id,
        ticketsByItem,
        tx,
        pendingExpiresAt,
      );

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

      if (orderStatus === 'PAID') {
        await this.activateOrderTransferRequests(order.id, tx);
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
    await this.expirePendingOrders();

    return this.prisma.order.findMany({
      include: this.orderInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    await this.expireOrderNow(id);

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    return order;
  }

  async findByEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento nao encontrado');
    }

    await this.expirePendingOrders({ eventId });

    return this.prisma.order.findMany({
      where: { eventId },
      include: this.orderInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findCustomerOrders(customerEmail: string) {
    const normalizedCustomerEmail = this.normalizeEmail(customerEmail);
    await this.expirePendingOrders({ customerEmail: normalizedCustomerEmail || '' });

    return this.prisma.order.findMany({
      where: {
        customerEmail: normalizedCustomerEmail || '',
      },
      include: this.orderInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findCustomerOrderById(orderId: string, customerEmail: string) {
    const normalizedCustomerEmail = this.normalizeEmail(customerEmail);
    await this.expireOrderNow(orderId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    if (order.customerEmail !== normalizedCustomerEmail) {
      throw new ForbiddenException(
        'Voce nao tem permissao para visualizar este pedido',
      );
    }

    return order;
  }

  private async cancelSingleTicket(params: {
    ticketId: string;
    userId?: string;
    mode?: string;
  }) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: params.ticketId },
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
      throw new NotFoundException('Ingresso nao encontrado');
    }

    if (ticket.status === 'USED') {
      throw new BadRequestException(
        'Nao e possivel cancelar um ingresso ja utilizado',
      );
    }

    if (ticket.status === 'CANCELED') {
      throw new BadRequestException('Este ingresso ja esta cancelado');
    }

    const order = ticket.orderItem.order;
    const originalAmount = new Prisma.Decimal(ticket.orderItem.unitPrice);
    const cancellationConfig = this.getCancellationConfig(params.mode);
    const returnedAmount = originalAmount.mul(cancellationConfig.percent);

    return this.prisma.$transaction(async (tx) => {
      if (params.userId) {
        await tx.ticketCancellation.create({
          data: {
            ticketId: ticket.id,
            orderId: order.id,
            userId: params.userId,
            mode: cancellationConfig.mode,
            originalAmount,
            returnedAmount: order.status === 'PAID' ? returnedAmount : new Prisma.Decimal(0),
            status: order.status === 'PAID' ? cancellationConfig.cancellationStatus : 'NO_REFUND',
          },
        });
      }

      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'CANCELED',
        },
      });

      await tx.ticketTransferRequest.updateMany({
        where: {
          ticketId: ticket.id,
          status: {
            in: ['PENDING_PAYMENT', 'PENDING_ACCEPTANCE'],
          },
        },
        data: {
          status: 'CANCELED',
          respondedAt: new Date(),
          responseReason: 'Ticket cancelado',
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

      await this.updateOrderPlaceReservationsStatus(
        order.id,
        'CANCELED',
        tx,
        ticket.orderItem.ticketTypeId,
      );

      if (
        order.status === 'PAID' &&
        cancellationConfig.createWalletCredit &&
        params.userId &&
        returnedAmount.gt(0)
      ) {
        await tx.walletTransaction.create({
          data: {
            userId: params.userId,
            type: 'CREDIT',
            source: 'TICKET_CANCELLATION',
            sourceId: ticket.id,
            amount: returnedAmount,
            description: `Credito por cancelamento do ingresso ${ticket.id}`,
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

      const updatedTotalAmount = new Prisma.Decimal(order.totalAmount).sub(originalAmount);
      const safeTotalAmount = updatedTotalAmount.lt(0)
        ? new Prisma.Decimal(0)
        : updatedTotalAmount;

      await tx.order.update({
        where: { id: order.id },
        data: {
          totalAmount: safeTotalAmount,
          status: remainingTickets === 0 ? 'CANCELED' : order.status,
          expiresAt: remainingTickets === 0 ? null : order.expiresAt,
        },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: this.orderInclude,
      });
    });
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
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ingresso nao encontrado');
    }

    const normalizedCustomerEmail = this.normalizeEmail(customerEmail);
    const order = ticket.orderItem.order;

    if (order.customerEmail !== normalizedCustomerEmail && order.customerUserId !== userId) {
      throw new ForbiddenException(
        'Voce nao tem permissao para cancelar este ingresso',
      );
    }

    return this.cancelSingleTicket({
      ticketId,
      userId,
      mode: body?.mode,
    });
  }

  async cancelCustomerOrder(
    orderId: string,
    userId: string,
    customerEmail: string,
    body?: CancelOrderDto,
  ) {
    const normalizedCustomerEmail = this.normalizeEmail(customerEmail);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            tickets: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    if (order.customerEmail !== normalizedCustomerEmail && order.customerUserId !== userId) {
      throw new ForbiddenException(
        'Voce nao tem permissao para cancelar este pedido',
      );
    }

    return this.cancelOrderTickets(orderId, body?.mode, userId);
  }

  async cancel(id: string, body?: CancelOrderDto) {
    return this.cancelOrderTickets(id, body?.mode);
  }

  private async cancelOrderTickets(orderId: string, mode?: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            tickets: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    if (order.status === 'CANCELED') {
      throw new BadRequestException('O pedido ja esta cancelado');
    }

    for (const item of order.items) {
      for (const ticket of item.tickets) {
        if (ticket.status !== 'CANCELED' && ticket.status !== 'USED') {
          await this.cancelSingleTicket({
            ticketId: ticket.id,
            userId,
            mode,
          });
        }
      }
    }

    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderInclude,
    });
  }
}

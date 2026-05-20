// @ts-nocheck
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerSupportMessageDto } from './dto/create-customer-support-message.dto';
import { CreateCustomerSupportThreadDto } from './dto/create-customer-support-thread.dto';
import { CreateLinkedSupportThreadDto } from './dto/create-linked-support-thread.dto';
import {
  LinkedSupportForwardDto,
  LinkedSupportMessageDto,
  LinkedSupportResolveDto,
  LinkedSupportReturnDto,
} from './dto/linked-support-action.dto';

type SupportActor = {
  userId: string;
  email: string;
  role: string;
  name?: string;
};

type SupportParticipantType = 'CUSTOMER' | 'PRODUCER' | 'OPERATOR' | 'SUPER_ADMIN';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private threadInclude = {
    organizer: true,
    event: true,
    order: true,
    assignedUser: true,
    messages: {
      orderBy: {
        createdAt: 'asc' as const,
      },
    },
  } as const;

  private compactThreadInclude = {
    event: true,
    order: true,
    organizer: true,
    assignedUser: true,
    messages: {
      orderBy: {
        createdAt: 'asc' as const,
      },
      take: 1,
    },
  } as const;

  private normalizeRole(role?: string): SupportParticipantType {
    const value = String(role || '').toUpperCase();

    if (value === 'SUPER_ADMIN') return 'SUPER_ADMIN';
    if (value === 'OPERATOR') return 'OPERATOR';
    if (value === 'CUSTOMER') return 'CUSTOMER';

    return 'PRODUCER';
  }

  private actorSenderType(actor: SupportActor): SupportParticipantType {
    return this.normalizeRole(actor.role);
  }

  private normalizeOwnerType(owner?: string): SupportParticipantType {
    const value = this.normalizeRole(owner);

    if (value === 'CUSTOMER') return 'CUSTOMER';

    return value;
  }

  private makeProtocol() {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');

    const random = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `ASTRO-SUP-${stamp}-${random}`;
  }

  private assertMessage(value: string, label = 'Mensagem') {
    const message = String(value || '').trim();

    if (!message) {
      throw new BadRequestException(`${label} é obrigatória`);
    }

    return message;
  }

  private makeHistoryItem(
    action: string,
    actor: SupportActor,
    extras: Record<string, unknown> = {},
  ) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      byUserId: actor.userId,
      byName: actor.name || actor.email || 'Sistema',
      byEmail: actor.email,
      byRole: this.actorSenderType(actor),
      createdAt: new Date().toISOString(),
      ...extras,
    };
  }

  private appendHistory(thread: any, item: Record<string, unknown>) {
    const previous = Array.isArray(thread?.supportHistory)
      ? thread.supportHistory
      : [];

    return [...previous, item];
  }

  private uniqueParticipants(participants: any[]) {
    const map = new Map<string, any>();

    for (const participant of participants) {
      if (!participant) continue;

      const type = this.normalizeOwnerType(participant.type);
      const key = [
        type,
        participant.userId || '',
        String(participant.email || '').toLowerCase(),
        String(participant.name || '').toLowerCase(),
      ].join('|');

      if (!map.has(key)) {
        map.set(key, {
          type,
          userId: participant.userId || undefined,
          name: participant.name || participant.email || type,
          email: participant.email || undefined,
          addedAt: participant.addedAt || new Date().toISOString(),
        });
      }
    }

    return Array.from(map.values());
  }

  private mergeParticipants(thread: any, participants: any[]) {
    const previous = Array.isArray(thread?.participants) ? thread.participants : [];

    return this.uniqueParticipants([...previous, ...participants]);
  }

  private actorParticipant(actor: SupportActor) {
    return {
      type: this.actorSenderType(actor),
      userId: actor.userId,
      name: actor.name || actor.email,
      email: actor.email,
    };
  }

  private statusFromOwner(ownerType: string) {
    if (ownerType === 'SUPER_ADMIN') return 'FORWARDED_TO_SUPER_ADMIN';
    if (ownerType === 'OPERATOR') return 'RETURNED_TO_OPERATOR';
    if (ownerType === 'PRODUCER') return 'RETURNED_TO_PRODUCER';
    if (ownerType === 'CUSTOMER') return 'CUSTOMER_REPLY';

    return 'OPEN';
  }

  private nextOwnerFromTarget(targetType: string, fallbackOwner: string) {
    const target = String(targetType || 'ALL').toUpperCase();

    if (['CUSTOMER', 'PRODUCER', 'OPERATOR', 'SUPER_ADMIN'].includes(target)) {
      return target;
    }

    return fallbackOwner || 'PRODUCER';
  }

  private async resolveEventForLinkedThread(actor: SupportActor, eventId?: string) {
    if (eventId) {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          organizer: true,
        },
      });

      if (!event) {
        throw new NotFoundException('Evento não encontrado');
      }

      return event;
    }

    const actorRole = this.actorSenderType(actor);

    const event = await this.prisma.event.findFirst({
      where:
        actorRole === 'PRODUCER'
          ? {
              organizer: {
                ownerUserId: actor.userId,
              },
            }
          : {},
      include: {
        organizer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!event) {
      throw new BadRequestException(
        'Selecione um evento para abrir o chamado técnico.',
      );
    }

    return event;
  }

  async createCustomerThread(
    userId: string,
    customerEmail: string,
    customerName: string,
    body: CreateCustomerSupportThreadDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: body.orderId },
      include: {
        event: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (order.customerEmail !== customerEmail) {
      throw new ForbiddenException(
        'Você não tem permissão para abrir suporte para este pedido',
      );
    }

    const subject = this.assertMessage(body.subject, 'Assunto');
    const message = this.assertMessage(body.message);

    const actor: SupportActor = {
      userId,
      email: customerEmail,
      name: customerName || order.customerName,
      role: 'CUSTOMER',
    };

    return this.prisma.$transaction(async (tx) => {
      const thread = await tx.supportThread.create({
        data: {
          organizerId: order.event.organizerId,
          eventId: order.eventId,
          orderId: order.id,
          customerEmail,
          customerName: customerName || order.customerName,
          subject,
          status: 'OPEN',
          protocol: this.makeProtocol(),
          priority: 'NORMAL',
          category: 'CUSTOMER_SUPPORT',
          sourceType: 'CUSTOMER',
          currentOwnerType: 'PRODUCER',
          participants: this.uniqueParticipants([
            this.actorParticipant(actor),
            { type: 'PRODUCER', name: 'Produtor/Admin' },
          ]),
          lastMessageAt: new Date(),
          supportHistory: [
            this.makeHistoryItem('Chamado criado pelo cliente', actor, {
              to: 'PRODUCER',
            }),
          ],
          messages: {
            create: {
              senderUserId: userId,
              senderName: customerName || order.customerName,
              senderEmail: customerEmail,
              senderType: 'CUSTOMER',
              kind: 'MESSAGE',
              internal: false,
              targetType: 'PRODUCER',
              message,
            },
          },
        },
        include: this.threadInclude,
      });

      return thread;
    });
  }

  async listCustomerThreads(customerEmail: string) {
    return this.prisma.supportThread.findMany({
      where: {
        customerEmail,
      },
      include: this.compactThreadInclude,
      orderBy: {
        lastMessageAt: 'desc',
      },
    });
  }

  async findCustomerThreadById(threadId: string, customerEmail: string) {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
      include: this.threadInclude,
    });

    if (!thread) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    if (thread.customerEmail !== customerEmail) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este atendimento',
      );
    }

    return thread;
  }

  async createCustomerMessage(
    threadId: string,
    userId: string,
    customerEmail: string,
    customerName: string,
    body: CreateCustomerSupportMessageDto,
  ) {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    if (thread.customerEmail !== customerEmail) {
      throw new ForbiddenException(
        'Você não tem permissão para responder neste atendimento',
      );
    }

    const message = this.assertMessage(body.message);
    const actor: SupportActor = {
      userId,
      email: customerEmail,
      name: customerName || thread.customerName || 'Cliente',
      role: 'CUSTOMER',
    };

    return this.prisma.$transaction(async (tx) => {
      await tx.supportMessage.create({
        data: {
          threadId,
          senderUserId: userId,
          senderName: actor.name,
          senderEmail: customerEmail,
          senderType: 'CUSTOMER',
          kind: 'MESSAGE',
          internal: false,
          targetType: 'PRODUCER',
          message,
        },
      });

      const updatedThread = await tx.supportThread.update({
        where: { id: threadId },
        data: {
          status: 'CUSTOMER_REPLY',
          currentOwnerType: 'PRODUCER',
          participants: this.mergeParticipants(thread, [this.actorParticipant(actor)]),
          supportHistory: this.appendHistory(
            thread,
            this.makeHistoryItem('Resposta do cliente', actor, {
              to: 'PRODUCER',
            }),
          ),
          lastMessageAt: new Date(),
        },
        include: this.threadInclude,
      });

      return updatedThread;
    });
  }

  async listAdminThreads() {
    return this.prisma.supportThread.findMany({
      include: this.compactThreadInclude,
      orderBy: {
        lastMessageAt: 'desc',
      },
    });
  }

  async findAdminThreadById(threadId: string) {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
      include: this.threadInclude,
    });

    if (!thread) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return thread;
  }

  async createAdminMessage(
    threadId: string,
    userId: string,
    userName: string,
    userEmail: string,
    body: CreateCustomerSupportMessageDto,
  ) {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    const message = this.assertMessage(body.message);
    const actor: SupportActor = {
      userId,
      email: userEmail,
      name: userName || 'Atendente',
      role: 'ADMIN',
    };

    return this.prisma.$transaction(async (tx) => {
      await tx.supportMessage.create({
        data: {
          threadId,
          senderUserId: userId,
          senderName: actor.name,
          senderEmail: userEmail,
          senderType: 'PRODUCER',
          kind: 'MESSAGE',
          internal: false,
          targetType: 'CUSTOMER',
          message,
        },
      });

      const updatedThread = await tx.supportThread.update({
        where: { id: threadId },
        data: {
          status: 'PRODUCER_REPLY',
          currentOwnerType: 'CUSTOMER',
          lastMessageAt: new Date(),
          assignedUserId: userId,
          participants: this.mergeParticipants(thread, [this.actorParticipant(actor)]),
          supportHistory: this.appendHistory(
            thread,
            this.makeHistoryItem('Resposta do produtor/admin', actor, {
              to: 'CUSTOMER',
            }),
          ),
        },
        include: this.threadInclude,
      });

      return updatedThread;
    });
  }

  async closeThread(threadId: string, userId: string) {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return this.prisma.supportThread.update({
      where: { id: threadId },
      data: {
        status: 'CLOSED',
        assignedUserId: userId,
        resolvedAt: new Date(),
        lastMessageAt: new Date(),
      },
      include: this.threadInclude,
    });
  }

  async reopenThread(threadId: string, userId?: string) {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return this.prisma.supportThread.update({
      where: { id: threadId },
      data: {
        status: 'OPEN',
        currentOwnerType: 'PRODUCER',
        assignedUserId: userId || thread.assignedUserId || undefined,
        lastMessageAt: new Date(),
      },
      include: this.threadInclude,
    });
  }

  async createLinkedThread(actor: SupportActor, body: CreateLinkedSupportThreadDto) {
    const title = this.assertMessage(body.title, 'Título');
    const message = this.assertMessage(body.message);
    const actorType = this.actorSenderType(actor);
    const event = await this.resolveEventForLinkedThread(actor, body.eventId);
    const sourceType = this.normalizeOwnerType(body.sourceType || actorType);
    const ownerType = this.normalizeOwnerType(body.currentOwnerType || 'SUPER_ADMIN');
    const targetType = String(body.targetType || ownerType || 'SUPER_ADMIN').toUpperCase();

    const customerEmail =
      body.customerEmail ||
      (sourceType === 'CUSTOMER' ? actor.email : undefined);
    const customerName =
      body.customerName ||
      (sourceType === 'CUSTOMER' ? actor.name || actor.email : undefined);

    const producerEmail =
      body.producerEmail ||
      (sourceType === 'PRODUCER' ? actor.email : undefined);
    const producerName =
      body.producerName ||
      (sourceType === 'PRODUCER' ? actor.name || actor.email : undefined);

    const operatorEmail =
      body.operatorEmail ||
      (sourceType === 'OPERATOR' ? actor.email : undefined);
    const operatorName =
      body.operatorName ||
      (sourceType === 'OPERATOR' ? actor.name || actor.email : undefined);

    return this.prisma.supportThread.create({
      data: {
        protocol: this.makeProtocol(),
        organizerId: event.organizerId,
        eventId: event.id,
        orderId: body.orderId || undefined,
        customerEmail: customerEmail || actor.email,
        customerName: customerName || actor.name || actor.email,
        subject: title,
        priority: body.priority || 'NORMAL',
        category: body.category || 'TECHNICAL_SUPPORT',
        sourceType,
        currentOwnerType: ownerType,
        status: this.statusFromOwner(ownerType),
        producerUserId:
          body.producerUserId ||
          (sourceType === 'PRODUCER' ? actor.userId : undefined),
        producerName,
        producerEmail,
        operatorUserId:
          body.operatorUserId ||
          (sourceType === 'OPERATOR' ? actor.userId : undefined),
        operatorName,
        operatorEmail,
        participants: this.uniqueParticipants([
          this.actorParticipant(actor),
          customerEmail || customerName
            ? { type: 'CUSTOMER', name: customerName, email: customerEmail }
            : null,
          producerEmail || producerName
            ? { type: 'PRODUCER', name: producerName, email: producerEmail }
            : null,
          operatorEmail || operatorName
            ? { type: 'OPERATOR', name: operatorName, email: operatorEmail }
            : null,
          { type: 'SUPER_ADMIN', name: 'Super Admin' },
        ]),
        lastMessageAt: new Date(),
        supportHistory: [
          this.makeHistoryItem('Chamado interligado criado', actor, {
            from: sourceType,
            to: ownerType,
          }),
        ],
        messages: {
          create: {
            senderUserId: actor.userId,
            senderName: actor.name || actor.email,
            senderEmail: actor.email,
            senderType: actorType,
            kind: 'MESSAGE',
            internal: false,
            targetType,
            message,
            metadata: {
              sourceType,
              targetType,
            },
          },
        },
      },
      include: this.threadInclude,
    });
  }

  async listLinkedThreads(actor: SupportActor, scope: 'PRODUCER' | 'OPERATOR' | 'SUPER_ADMIN') {
    const role = this.normalizeRole(actor.role);

    if (scope === 'SUPER_ADMIN') {
      if (role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Apenas Super Admin pode acessar esta fila');
      }

      return this.prisma.supportThread.findMany({
        where: {
          OR: [
            { currentOwnerType: 'SUPER_ADMIN' },
            { status: 'FORWARDED_TO_SUPER_ADMIN' },
            { sourceType: 'PRODUCER' },
            { sourceType: 'OPERATOR' },
          ],
        },
        include: this.compactThreadInclude,
        orderBy: {
          lastMessageAt: 'desc',
        },
      });
    }

    if (scope === 'OPERATOR') {
      return this.prisma.supportThread.findMany({
        where: {
          OR: [
            { currentOwnerType: 'OPERATOR' },
            { operatorUserId: actor.userId },
            { operatorEmail: actor.email },
            { sourceType: 'OPERATOR', customerEmail: actor.email },
          ],
        },
        include: this.compactThreadInclude,
        orderBy: {
          lastMessageAt: 'desc',
        },
      });
    }

    return this.prisma.supportThread.findMany({
      where: {
        OR: [
          { currentOwnerType: 'PRODUCER' },
          { producerUserId: actor.userId },
          { producerEmail: actor.email },
          {
            organizer: {
              ownerUserId: actor.userId,
            },
          },
          { sourceType: 'PRODUCER', customerEmail: actor.email },
        ],
      },
      include: this.compactThreadInclude,
      orderBy: {
        lastMessageAt: 'desc',
      },
    });
  }

  async findLinkedThreadById(actor: SupportActor, threadId: string) {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
      include: this.threadInclude,
    });

    if (!thread) {
      throw new NotFoundException('Chamado não encontrado');
    }

    const role = this.normalizeRole(actor.role);

    if (role === 'SUPER_ADMIN') {
      return thread;
    }

    const participants = Array.isArray(thread.participants)
      ? thread.participants
      : [];

    const participantMatch = participants.some((participant) => {
      return (
        String(participant?.userId || '') === actor.userId ||
        String(participant?.email || '').toLowerCase() ===
          String(actor.email || '').toLowerCase()
      );
    });

    const isOperator =
      thread.operatorUserId === actor.userId ||
      String(thread.operatorEmail || '').toLowerCase() ===
        String(actor.email || '').toLowerCase();

    const isProducer =
      thread.producerUserId === actor.userId ||
      String(thread.producerEmail || '').toLowerCase() ===
        String(actor.email || '').toLowerCase() ||
      thread.organizer?.ownerUserId === actor.userId;

    const isCustomer =
      String(thread.customerEmail || '').toLowerCase() ===
      String(actor.email || '').toLowerCase();

    if (!participantMatch && !isOperator && !isProducer && !isCustomer) {
      throw new ForbiddenException('Você não tem permissão para acessar este chamado');
    }

    return thread;
  }

  async addLinkedMessage(
    actor: SupportActor,
    threadId: string,
    body: LinkedSupportMessageDto,
  ) {
    const thread = await this.findLinkedThreadById(actor, threadId);
    const message = this.assertMessage(body.message);
    const senderType = this.actorSenderType(actor);
    const targetType = String(body.targetType || 'ALL').toUpperCase();
    const nextOwner = this.nextOwnerFromTarget(targetType, thread.currentOwnerType);

    return this.prisma.$transaction(async (tx) => {
      await tx.supportMessage.create({
        data: {
          threadId,
          senderUserId: actor.userId,
          senderName: actor.name || actor.email,
          senderEmail: actor.email,
          senderType,
          kind: 'MESSAGE',
          internal: Boolean(body.internal),
          targetType,
          message,
          metadata: {
            targetType,
          },
        },
      });

      return tx.supportThread.update({
        where: { id: threadId },
        data: {
          status: thread.status === 'OPEN' ? 'IN_PROGRESS' : thread.status,
          currentOwnerType: nextOwner,
          lastMessageAt: new Date(),
          participants: this.mergeParticipants(thread, [
            this.actorParticipant(actor),
            targetType !== 'ALL' ? { type: targetType } : null,
          ]),
          supportHistory: this.appendHistory(
            thread,
            this.makeHistoryItem('Resposta adicionada', actor, {
              to: targetType,
            }),
          ),
        },
        include: this.threadInclude,
      });
    });
  }

  async forwardLinkedToSuperAdmin(
    actor: SupportActor,
    threadId: string,
    body: LinkedSupportForwardDto,
  ) {
    const thread = await this.findLinkedThreadById(actor, threadId);
    const reason = this.assertMessage(body.reason, 'Motivo');
    const senderType = this.actorSenderType(actor);

    if (!['PRODUCER', 'OPERATOR'].includes(senderType)) {
      throw new ForbiddenException(
        'Apenas produtor/admin ou operador pode encaminhar ao Super Admin',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.supportMessage.create({
        data: {
          threadId,
          senderUserId: actor.userId,
          senderName: actor.name || actor.email,
          senderEmail: actor.email,
          senderType,
          kind: 'FORWARD',
          internal: false,
          targetType: 'SUPER_ADMIN',
          message: reason,
          metadata: {
            fullThreadForwarded: true,
            previousOwnerType: thread.currentOwnerType,
          },
        },
      });

      return tx.supportThread.update({
        where: { id: threadId },
        data: {
          status: 'FORWARDED_TO_SUPER_ADMIN',
          currentOwnerType: 'SUPER_ADMIN',
          forwardedAt: new Date(),
          lastMessageAt: new Date(),
          participants: this.mergeParticipants(thread, [
            this.actorParticipant(actor),
            { type: 'SUPER_ADMIN', name: 'Super Admin' },
          ]),
          supportHistory: this.appendHistory(
            thread,
            this.makeHistoryItem('Encaminhado ao Super Admin', actor, {
              from: thread.currentOwnerType,
              to: 'SUPER_ADMIN',
              note: reason,
              fullThreadForwarded: true,
            }),
          ),
        },
        include: this.threadInclude,
      });
    });
  }

  async returnLinkedFromSuperAdmin(
    actor: SupportActor,
    threadId: string,
    body: LinkedSupportReturnDto,
  ) {
    const thread = await this.findLinkedThreadById(actor, threadId);
    const role = this.normalizeRole(actor.role);

    if (role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Apenas Super Admin pode devolver chamados');
    }

    const response = this.assertMessage(body.response, 'Resposta');
    const target = this.normalizeOwnerType(body.target);

    return this.prisma.$transaction(async (tx) => {
      await tx.supportMessage.create({
        data: {
          threadId,
          senderUserId: actor.userId,
          senderName: actor.name || actor.email || 'Super Admin',
          senderEmail: actor.email,
          senderType: 'SUPER_ADMIN',
          kind: 'RETURN',
          internal: false,
          targetType: target,
          message: response,
          metadata: {
            returnedTo: target,
          },
        },
      });

      return tx.supportThread.update({
        where: { id: threadId },
        data: {
          status:
            target === 'OPERATOR'
              ? 'RETURNED_TO_OPERATOR'
              : target === 'CUSTOMER'
                ? 'CUSTOMER_REPLY'
                : 'RETURNED_TO_PRODUCER',
          currentOwnerType: target,
          returnedAt: new Date(),
          lastMessageAt: new Date(),
          participants: this.mergeParticipants(thread, [
            this.actorParticipant(actor),
            { type: target },
          ]),
          supportHistory: this.appendHistory(
            thread,
            this.makeHistoryItem('Devolvido pelo Super Admin', actor, {
              from: 'SUPER_ADMIN',
              to: target,
              note: response,
            }),
          ),
        },
        include: this.threadInclude,
      });
    });
  }

  async resolveLinkedThread(
    actor: SupportActor,
    threadId: string,
    body: LinkedSupportResolveDto,
  ) {
    const thread = await this.findLinkedThreadById(actor, threadId);
    const response = this.assertMessage(body.response, 'Solução');
    const senderType = this.actorSenderType(actor);
    const targetType = String(body.targetType || 'ALL').toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      await tx.supportMessage.create({
        data: {
          threadId,
          senderUserId: actor.userId,
          senderName: actor.name || actor.email,
          senderEmail: actor.email,
          senderType,
          kind: 'RESOLUTION',
          internal: false,
          targetType,
          message: response,
          metadata: {
            resolvedBy: senderType,
            targetType,
          },
        },
      });

      return tx.supportThread.update({
        where: { id: threadId },
        data: {
          status: body.status || 'RESOLVED',
          resolvedAt: new Date(),
          currentOwnerType: thread.currentOwnerType,
          lastMessageAt: new Date(),
          participants: this.mergeParticipants(thread, [
            this.actorParticipant(actor),
          ]),
          supportHistory: this.appendHistory(
            thread,
            this.makeHistoryItem('Chamado resolvido', actor, {
              note: response,
              to: targetType,
            }),
          ),
        },
        include: this.threadInclude,
      });
    });
  }
}
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerSupportMessageDto } from './dto/create-customer-support-message.dto';
import { CreateCustomerSupportThreadDto } from './dto/create-customer-support-thread.dto';

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

    const subject = body.subject.trim();
    const message = body.message.trim();

    if (!subject) {
      throw new BadRequestException('Assunto é obrigatório');
    }

    if (!message) {
      throw new BadRequestException('Mensagem é obrigatória');
    }

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
          lastMessageAt: new Date(),
          messages: {
            create: {
              senderUserId: userId,
              senderName: customerName || order.customerName,
              senderEmail: customerEmail,
              senderType: 'CUSTOMER',
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
      include: {
        event: true,
        order: true,
        organizer: true,
        assignedUser: true,
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
      },
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

    const message = body.message.trim();

    if (!message) {
      throw new BadRequestException('Mensagem é obrigatória');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.supportMessage.create({
        data: {
          threadId,
          senderUserId: userId,
          senderName: customerName || thread.customerName || 'Cliente',
          senderEmail: customerEmail,
          senderType: 'CUSTOMER',
          message,
        },
      });

      const updatedThread = await tx.supportThread.update({
        where: { id: threadId },
        data: {
          status: 'CUSTOMER_REPLY',
          lastMessageAt: new Date(),
        },
        include: this.threadInclude,
      });

      return updatedThread;
    });
  }

  async listAdminThreads() {
    return this.prisma.supportThread.findMany({
      include: {
        event: true,
        order: true,
        organizer: true,
        assignedUser: true,
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
      },
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

    const message = body.message.trim();

    if (!message) {
      throw new BadRequestException('Mensagem é obrigatória');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.supportMessage.create({
        data: {
          threadId,
          senderUserId: userId,
          senderName: userName || 'Atendente',
          senderEmail: userEmail,
          senderType: 'ADMIN',
          message,
        },
      });

      const updatedThread = await tx.supportThread.update({
        where: { id: threadId },
        data: {
          status: 'PRODUCER_REPLY',
          lastMessageAt: new Date(),
          assignedUserId: userId,
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
        assignedUserId: userId || thread.assignedUserId || undefined,
        lastMessageAt: new Date(),
      },
      include: this.threadInclude,
    });
  }
}
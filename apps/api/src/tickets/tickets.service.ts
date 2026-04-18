import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.ticket.findMany({
      include: {
        orderItem: {
          include: {
            order: true,
            ticketType: {
              include: {
                event: true,
              },
            },
          },
        },
        checkins: {
          orderBy: {
            checkedAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        orderItem: {
          include: {
            order: true,
            ticketType: {
              include: {
                event: true,
              },
            },
          },
        },
        checkins: {
          orderBy: {
            checkedAt: 'desc',
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado');
    }

    return ticket;
  }

  async findByCode(code: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { code },
      include: {
        orderItem: {
          include: {
            order: true,
            ticketType: {
              include: {
                event: true,
              },
            },
          },
        },
        checkins: {
          orderBy: {
            checkedAt: 'desc',
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado');
    }

    return ticket;
  }
}
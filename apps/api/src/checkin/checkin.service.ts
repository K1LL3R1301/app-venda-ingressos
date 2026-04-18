import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckinDto } from './dto/create-checkin.dto';

@Injectable()
export class CheckinService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCheckinDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { code: data.code },
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

    const order = ticket.orderItem?.order;

    if (!order) {
      throw new BadRequestException('Pedido do ingresso não encontrado');
    }

    if (order.status !== 'PAID') {
      throw new BadRequestException(
        'Não é possível realizar check-in de pedido não pago',
      );
    }

    if (ticket.status === 'USED') {
      throw new BadRequestException('Ingresso já utilizado');
    }

    if (ticket.status === 'CANCELED') {
      throw new BadRequestException('Ingresso cancelado');
    }

    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'USED',
      },
    });

    const checkin = await this.prisma.checkin.create({
      data: {
        ticketId: ticket.id,
      },
      include: {
        ticket: {
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
          },
        },
      },
    });

    return {
      message: 'Check-in realizado com sucesso',
      checkin,
    };
  }

  async findAll() {
    return this.prisma.checkin.findMany({
      include: {
        ticket: {
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
          },
        },
      },
      orderBy: {
        checkedAt: 'desc',
      },
    });
  }
}
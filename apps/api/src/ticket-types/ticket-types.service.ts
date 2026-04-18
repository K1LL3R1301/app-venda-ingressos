import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';

@Injectable()
export class TicketTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTicketTypeDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: data.eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    return this.prisma.ticketType.create({
      data: {
        eventId: data.eventId,
        name: data.name,
        description: data.description,
        price: data.price,
        quantity: data.quantity,
      },
      include: {
        event: true,
      },
    });
  }

  async findAll() {
    return this.prisma.ticketType.findMany({
      include: {
        event: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id },
      include: {
        event: true,
      },
    });

    if (!ticketType) {
      throw new NotFoundException('Tipo de ingresso não encontrado');
    }

    return ticketType;
  }

  async update(id: string, data: UpdateTicketTypeDto) {
    const existingTicketType = await this.prisma.ticketType.findUnique({
      where: { id },
    });

    if (!existingTicketType) {
      throw new NotFoundException('Tipo de ingresso não encontrado');
    }

    if (data.eventId) {
      const event = await this.prisma.event.findUnique({
        where: { id: data.eventId },
      });

      if (!event) {
        throw new NotFoundException('Evento não encontrado');
      }
    }

    return this.prisma.ticketType.update({
      where: { id },
      data: {
        eventId: data.eventId,
        name: data.name,
        description: data.description,
        price: data.price,
        quantity: data.quantity,
        status: data.status,
      },
      include: {
        event: true,
      },
    });
  }
}
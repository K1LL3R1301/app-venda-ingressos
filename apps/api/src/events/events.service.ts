import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEventDto) {
    const organizer = await this.prisma.organizer.findUnique({
      where: { id: data.organizerId },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer não encontrado');
    }

    return this.prisma.event.create({
      data: {
        organizerId: data.organizerId,
        name: data.name,
        description: data.description,
        eventDate: new Date(data.eventDate),
        capacity: data.capacity,
      },
      include: {
        organizer: true,
      },
    });
  }

  async findAll() {
    return this.prisma.event.findMany({
      include: {
        organizer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        organizer: true,
        ticketTypes: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    return event;
  }

  async update(id: string, data: UpdateEventDto) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundException('Evento não encontrado');
    }

    if (data.organizerId) {
      const organizer = await this.prisma.organizer.findUnique({
        where: { id: data.organizerId },
      });

      if (!organizer) {
        throw new NotFoundException('Organizer não encontrado');
      }
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        organizerId: data.organizerId,
        name: data.name,
        description: data.description,
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        capacity: data.capacity,
        status: data.status,
      },
      include: {
        organizer: true,
        ticketTypes: true,
      },
    });
  }
}
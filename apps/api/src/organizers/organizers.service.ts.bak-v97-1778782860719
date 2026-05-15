import { Injectable } from '@nestjs/common';
import { CreateOrganizerDto } from './dto/create-organizer.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrganizerDto) {
    return this.prisma.organizer.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.organizer.findMany();
  }
}
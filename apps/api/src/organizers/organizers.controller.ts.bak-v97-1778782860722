import { Controller, Post, Body, Get } from '@nestjs/common';
import { OrganizersService } from './organizers.service';
import { CreateOrganizerDto } from './dto/create-organizer.dto';

@Controller('organizers')
export class OrganizersController {
  constructor(private readonly service: OrganizersService) {}

  @Post()
  create(@Body() body: CreateOrganizerDto) {
    return this.service.create(body);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
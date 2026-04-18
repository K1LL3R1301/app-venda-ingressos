import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TicketTypesService } from './ticket-types.service';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';

@Controller('ticket-types')
export class TicketTypesController {
  constructor(private readonly ticketTypesService: TicketTypesService) {}

  @Post()
  create(@Body() body: CreateTicketTypeDto) {
    return this.ticketTypesService.create(body);
  }

  @Get()
  findAll() {
    return this.ticketTypesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.ticketTypesService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateTicketTypeDto) {
    return this.ticketTypesService.update(id, body);
  }
}
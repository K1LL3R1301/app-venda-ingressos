import { Controller, Get, Param } from '@nestjs/common';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.ticketsService.findByCode(code);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.ticketsService.findById(id);
  }
}
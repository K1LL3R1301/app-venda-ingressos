import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsQrService } from './tickets-qr.service';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, TicketsQrService],
})
export class TicketsModule {}
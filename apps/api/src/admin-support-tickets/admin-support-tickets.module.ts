import { Module } from '@nestjs/common';
import { AdminSupportTicketsController } from './admin-support-tickets.controller';
import { AdminSupportTicketsService } from './admin-support-tickets.service';

@Module({
  controllers: [AdminSupportTicketsController],
  providers: [AdminSupportTicketsService],
})
export class AdminSupportTicketsModule {}


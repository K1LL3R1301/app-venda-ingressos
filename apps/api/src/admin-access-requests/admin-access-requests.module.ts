import { Module } from '@nestjs/common';
import { AdminAccessRequestsController } from './admin-access-requests.controller';
import { AdminAccessRequestsService } from './admin-access-requests.service';

@Module({
  controllers: [AdminAccessRequestsController],
  providers: [AdminAccessRequestsService],
})
export class AdminAccessRequestsModule {}


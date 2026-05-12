import { Module } from '@nestjs/common';
import { EventFullUpdateController } from './event-full-update.controller';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  controllers: [EventsController, EventFullUpdateController],
  providers: [EventsService],
})
export class EventsModule {}

import { Module } from '@nestjs/common';
import { EventMapAiController } from './event-map-ai.controller';
import { EventMapAiService } from './event-map-ai.service';

@Module({
  controllers: [EventMapAiController],
  providers: [EventMapAiService],
})
export class AiModule {}

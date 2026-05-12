import { Body, Controller, Post } from '@nestjs/common';
import { GenerateEventMapAiDto } from './dto/generate-event-map-ai.dto';
import { EventMapAiService } from './event-map-ai.service';

@Controller('ai/event-map')
export class EventMapAiController {
  constructor(private readonly eventMapAiService: EventMapAiService) {}

  @Post('generate')
  generate(@Body() body: GenerateEventMapAiDto) {
    return this.eventMapAiService.generate(body);
  }
}

import { Module } from '@nestjs/common';
import { PromotionBoostsController } from './promotion-boosts.controller';
import { PromotionBoostsService } from './promotion-boosts.service';

@Module({
  controllers: [PromotionBoostsController],
  providers: [PromotionBoostsService],
})
export class PromotionBoostsModule {}


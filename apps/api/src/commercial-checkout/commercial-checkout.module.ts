import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommercialCheckoutController } from './commercial-checkout.controller';
import { CommercialCheckoutService } from './commercial-checkout.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommercialCheckoutController],
  providers: [CommercialCheckoutService],
  exports: [CommercialCheckoutService],
})
export class CommercialCheckoutModule {}
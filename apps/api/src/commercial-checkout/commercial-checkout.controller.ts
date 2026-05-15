import { Body, Controller, Post } from '@nestjs/common';
import { CommercialCheckoutService } from './commercial-checkout.service';

@Controller('commercial-checkout')
export class CommercialCheckoutController {
  constructor(private readonly commercialCheckoutService: CommercialCheckoutService) {}

  @Post('validate-coupon')
  validateCoupon(@Body() body: any) {
    return this.commercialCheckoutService.validateCoupon(body);
  }

  @Post('resolve-ref')
  resolveRef(@Body() body: any) {
    return this.commercialCheckoutService.resolveRef(body);
  }

  @Post('sync-paid-order')
  syncPaidOrder(@Body() body: any) {
    return this.commercialCheckoutService.syncPaidOrder(body);
  }

  @Post('sync-canceled-order')
  syncCanceledOrder(@Body() body: any) {
    return this.commercialCheckoutService.syncCanceledOrder(body);
  }
}
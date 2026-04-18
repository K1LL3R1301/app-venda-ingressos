import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() body: CreatePaymentDto) {
    return this.paymentsService.create(body);
  }

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }
}
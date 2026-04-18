import { IsIn, IsNumberString, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  orderId: string;

  @IsNumberString()
  amount: string;

  @IsString()
  @IsIn(['PIX', 'CARD', 'CASH', 'MANUAL'])
  method: string;
}
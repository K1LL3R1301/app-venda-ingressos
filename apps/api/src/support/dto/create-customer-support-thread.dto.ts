import { IsString, MinLength } from 'class-validator';

export class CreateCustomerSupportThreadDto {
  @IsString()
  orderId: string;

  @IsString()
  @MinLength(3)
  subject: string;

  @IsString()
  @MinLength(3)
  message: string;
}
import { IsString, MinLength } from 'class-validator';

export class CreateCustomerSupportMessageDto {
  @IsString()
  @MinLength(1)
  message: string;
}
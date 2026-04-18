import { IsInt, IsNumberString, IsOptional, IsString, Min } from 'class-validator';

export class CreateTicketTypeDto {
  @IsString()
  eventId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumberString()
  price: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
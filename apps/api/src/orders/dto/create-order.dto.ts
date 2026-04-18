import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateOrderItemDto {
  @IsString()
  ticketTypeId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  customerName: string;

  @IsEmail()
  customerEmail: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
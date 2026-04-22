import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class CreateOrderTicketHolderDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value || '').replace(/\D/g, ''))
  @Length(11, 11, { message: 'CPF do titular deve ter 11 dígitos' })
  cpf?: string;
}

class CreateOrderItemDto {
  @IsString()
  ticketTypeId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderTicketHolderDto)
  holders?: CreateOrderTicketHolderDto[];
}

export class CreateOrderDto {
  @IsString()
  eventId: string;

  @IsString()
  customerName: string;

  @IsEmail()
  customerEmail: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value || '').replace(/\D/g, ''))
  @Length(11, 11, { message: 'CPF do comprador deve ter 11 dígitos' })
  customerCpf?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsBoolean()
  useWalletBalance?: boolean;
}
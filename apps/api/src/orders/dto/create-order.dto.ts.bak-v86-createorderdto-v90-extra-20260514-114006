import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
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

export class CreateOrderPlaceSubTicketDto {
  @IsString()
  ticketTypeId: string;

  @IsString()
  @IsIn(['INTEIRA', 'MEIA', 'SOCIAL'])
  kind: string;

  @IsString()
  label: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitAmount: number;
}

export class CreateOrderPlaceSelectionDto {
  @IsString()
  id: string;

  @IsString()
  ticketTypeId: string;

  @IsString()
  sessionId: string;

  @IsString()
  sectorId: string;

  @IsString()
  objectId: string;

  @IsString()
  @IsIn(['SEAT', 'TABLE_CHAIR', 'TABLE_FULL'])
  kind: string;

  @IsString()
  label: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  chairCount?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderPlaceSubTicketDto)
  subTickets?: CreateOrderPlaceSubTicketDto[];
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
  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderPlaceSelectionDto)
  placeSelections?: CreateOrderPlaceSelectionDto[];

  @IsOptional()
  @IsBoolean()
  useWalletBalance?: boolean;
}

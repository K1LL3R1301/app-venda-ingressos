import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTicketTypeDto {
  @IsString()
  eventId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  lotLabel?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumberString()
  price: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsDateString()
  salesStartAt?: string;

  @IsOptional()
  @IsDateString()
  salesEndAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minPerOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPerOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsNumberString()
  feeAmount?: string;

  @IsOptional()
  @IsString()
  feeDescription?: string;

  @IsOptional()
  @IsString()
  benefitDescription?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isHidden?: boolean;

  @IsOptional()
  @IsString()
  status?: string;
}
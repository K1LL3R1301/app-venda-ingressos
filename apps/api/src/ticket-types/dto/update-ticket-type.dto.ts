import {
  IsNumberString,
  IsOptional,
  IsString,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateTicketTypeDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CreateEventContentDto,
  CreateEventLocationDto,
  CreateEventMediaDto,
  CreateEventPolicyDto,
} from './create-event.dto';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  organizerId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  saleStartAt?: string;

  @IsOptional()
  @IsDateString()
  saleEndAt?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsString()
  highlightTag?: string;

  @IsOptional()
  @IsString()
  checkoutTitle?: string;

  @IsOptional()
  @IsString()
  checkoutSubtitle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEventContentDto)
  content?: CreateEventContentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEventLocationDto)
  location?: CreateEventLocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEventMediaDto)
  media?: CreateEventMediaDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEventPolicyDto)
  policy?: CreateEventPolicyDto;
}
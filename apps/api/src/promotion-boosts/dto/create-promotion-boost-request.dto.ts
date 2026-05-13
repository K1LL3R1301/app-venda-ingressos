import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePromotionBoostRequestDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsString()
  @IsNotEmpty()
  eventTitle!: string;

  @IsString()
  @IsNotEmpty()
  eventDate!: string;

  @IsIn(['MAIN_CAROUSEL', 'PUBLICITY_BANNER', 'SECTION_SPOT'])
  placement!: 'MAIN_CAROUSEL' | 'PUBLICITY_BANNER' | 'SECTION_SPOT';

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  paymentProofText?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}


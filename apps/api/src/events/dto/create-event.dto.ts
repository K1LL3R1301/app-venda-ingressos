import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateEventTicketTypeDto {
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

export class CreateEventContentDto {
  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  fullDescription?: string;

  @IsOptional()
  @IsString()
  attractions?: string;

  @IsOptional()
  @IsString()
  schedule?: string;

  @IsOptional()
  @IsString()
  sectorDetails?: string;

  @IsOptional()
  @IsString()
  importantInfo?: string;

  @IsOptional()
  @IsString()
  faq?: string;

  @IsOptional()
  @IsString()
  producerDescription?: string;

  @IsOptional()
  @IsString()
  purchaseInstructions?: string;
}

export class CreateEventLocationDto {
  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  venueName?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsUrl()
  mapUrl?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  latitude?: string;

  @IsOptional()
  @IsString()
  longitude?: string;
}

export class CreateEventMediaDto {
  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsUrl()
  bannerImageUrl?: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsUrl()
  mobileBannerUrl?: string;

  @IsOptional()
  @IsUrl()
  sectorMapImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];
}

export class CreateEventPolicyDto {
  @IsOptional()
  @IsString()
  ageRating?: string;

  @IsOptional()
  @IsString()
  refundPolicy?: string;

  @IsOptional()
  @IsString()
  halfEntryPolicy?: string;

  @IsOptional()
  @IsString()
  transferPolicy?: string;

  @IsOptional()
  @IsString()
  termsNotes?: string;

  @IsOptional()
  @IsString()
  entryRules?: string;

  @IsOptional()
  @IsString()
  documentRules?: string;
}

export class CreateEventDto {
  @IsString()
  organizerId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  eventDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity: number;

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
  status?: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventTicketTypeDto)
  ticketTypes?: CreateEventTicketTypeDto[];
}
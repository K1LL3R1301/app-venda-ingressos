import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateEventSessionDto {
  @IsOptional()
  @IsString()
  localId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class CreateVenueSectorDto {
  @IsOptional()
  @IsString()
  localId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  occupancyMode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  gateName?: string;
}

export class CreateSeatMapObjectDto {
  @IsOptional()
  @IsString()
  localId?: string;

  @IsOptional()
  @IsString()
  venueSectorId?: string;

  @IsOptional()
  @IsString()
  venueSectorLocalId?: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  row?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  x?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  y?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  height?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rotation?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateVenueLayoutDto {
  @IsOptional()
  @IsString()
  localId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  occupancyMode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsObject()
  mapData?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSeatMapObjectDto)
  objects?: CreateSeatMapObjectDto[];
}

export class CreateEventTicketTypeDto {
  @IsOptional()
  @IsString()
  eventSessionId?: string;

  @IsOptional()
  @IsString()
  eventSessionLocalId?: string;

  @IsOptional()
  @IsString()
  venueSectorId?: string;

  @IsOptional()
  @IsString()
  venueSectorLocalId?: string;

  @IsOptional()
  @IsString()
  occupancyMode?: string;

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

  @IsString()
  @IsNotEmpty()
  venueName: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

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
  @IsString()
  occupancyMode?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  multiSession?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  allowSeatMap?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  allowTableMap?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEventContentDto)
  content?: CreateEventContentDto;

  @ValidateNested()
  @Type(() => CreateEventLocationDto)
  location: CreateEventLocationDto;

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
  @Type(() => CreateEventSessionDto)
  sessions?: CreateEventSessionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVenueSectorDto)
  sectors?: CreateVenueSectorDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVenueLayoutDto)
  venueLayouts?: CreateVenueLayoutDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventTicketTypeDto)
  ticketTypes?: CreateEventTicketTypeDto[];
}
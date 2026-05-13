import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAdminAccessRequestDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  cpfCnpj!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  producerName!: string;

  @IsString()
  @IsNotEmpty()
  producerDocument!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsNotEmpty()
  websiteOrSocial!: string;

  @IsString()
  @IsNotEmpty()
  eventTypes!: string;

  @IsString()
  @IsNotEmpty()
  firstEventDescription!: string;

  @IsString()
  @IsNotEmpty()
  estimatedEventDate!: string;

  @IsString()
  @IsNotEmpty()
  expectedAudience!: string;

  @IsString()
  @IsNotEmpty()
  experience!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsBoolean()
  acceptedReviewTerm!: boolean;

  @IsBoolean()
  acceptedTruthTerm!: boolean;

  @IsOptional()
  @IsString()
  extraNotes?: string;
}


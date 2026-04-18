import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateOrganizerDto {
  @IsString()
  tradeName: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
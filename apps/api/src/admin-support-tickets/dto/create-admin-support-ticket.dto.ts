import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAdminSupportTicketDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsString()
  @IsNotEmpty()
  eventTitle!: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  category?: string;
}


import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

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
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
import { IsDateString, IsInt, IsString, Min } from 'class-validator';

export class CreateEventDto {
  @IsString()
  organizerId: string;

  @IsString()
  name: string;

  @IsString()
  description?: string;

  @IsDateString()
  eventDate: string;

  @IsInt()
  @Min(1)
  capacity: number;
}
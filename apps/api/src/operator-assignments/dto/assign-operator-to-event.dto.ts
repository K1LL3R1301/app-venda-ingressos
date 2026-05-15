import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OperatorWorkDateDto {
  @IsString()
  date!: string;

  @IsString()
  amount!: string;

  @IsString()
  functions!: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}

export class AssignOperatorToEventDto {
  @IsString()
  eventId!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  canValidateTickets?: boolean;

  @IsOptional()
  @IsBoolean()
  canAnswerSupport?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatorWorkDateDto)
  workDates!: OperatorWorkDateDto[];
}

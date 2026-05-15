import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OperatorWorkDateResponseDto {
  @IsString()
  id!: string;

  @IsBoolean()
  available!: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RespondOperatorWorkPlanDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatorWorkDateResponseDto)
  responses!: OperatorWorkDateResponseDto[];
}

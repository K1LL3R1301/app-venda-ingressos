import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateOrganizerFeeConfigDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fixedCents?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}
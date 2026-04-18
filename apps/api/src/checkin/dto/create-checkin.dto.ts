import { IsOptional, IsString } from 'class-validator';

export class CreateCheckinDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  gate?: string;

  @IsOptional()
  @IsString()
  operatorName?: string;
}
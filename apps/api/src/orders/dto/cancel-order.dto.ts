import { IsIn, IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @IsIn(['WALLET_80'])
  mode?: string;
}
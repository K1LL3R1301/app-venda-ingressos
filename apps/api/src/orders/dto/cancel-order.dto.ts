import { IsIn, IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @IsIn(['REFUND_60', 'WALLET_80'])
  mode?: string;
}
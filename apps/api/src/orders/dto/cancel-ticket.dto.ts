import { IsIn, IsOptional, IsString } from 'class-validator';

export class CancelTicketDto {
  @IsOptional()
  @IsString()
  @IsIn(['WALLET_80'])
  mode?: string;
}
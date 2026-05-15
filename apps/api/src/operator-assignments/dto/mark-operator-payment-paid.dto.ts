import { IsOptional, IsString } from 'class-validator';

export class MarkOperatorPaymentPaidDto {
  @IsOptional()
  @IsString()
  paymentNotes?: string;

  @IsOptional()
  @IsString()
  paymentProofName?: string;

  @IsOptional()
  @IsString()
  paymentProofDataUrl?: string;
}

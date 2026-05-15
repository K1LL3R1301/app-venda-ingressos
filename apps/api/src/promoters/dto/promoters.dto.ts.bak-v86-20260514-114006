import { IsOptional, IsString } from 'class-validator';

export class CreatePromoterDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  pixKey?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  eventTitle?: string;

  @IsOptional()
  @IsString()
  commissionType?: string;

  @IsOptional()
  @IsString()
  commissionValue?: string;

  @IsOptional()
  @IsString()
  commissionBase?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateCouponDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  eventTitle?: string;

  @IsOptional()
  @IsString()
  promoterId?: string;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsString()
  discountValue?: string;

  @IsOptional()
  @IsString()
  usageLimit?: string;

  @IsOptional()
  @IsString()
  perCpfLimit?: string;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  validChannels?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePromoterLinkDto {
  @IsString()
  promoterId!: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  eventTitle?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePromoterSaleDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  eventTitle?: string;

  @IsOptional()
  @IsString()
  promoterId?: string;

  @IsOptional()
  @IsString()
  couponId?: string;

  @IsOptional()
  @IsString()
  linkId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerCpf?: string;

  @IsOptional()
  @IsString()
  grossAmount?: string;

  @IsOptional()
  @IsString()
  discountAmount?: string;

  @IsOptional()
  @IsString()
  netAmount?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SetCommercialStatusDto {
  @IsString()
  status!: string;
}

export class MarkPromoterCommissionPaidDto {
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

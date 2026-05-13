import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewPromotionBoostRequestDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  moderatorNote?: string;
}


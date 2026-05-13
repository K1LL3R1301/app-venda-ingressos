import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewAdminAccessRequestDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  moderatorNote?: string;
}


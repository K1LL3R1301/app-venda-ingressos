import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewAdminSupportTicketDto {
  @IsOptional()
  @IsString()
  replyText?: string;

  @IsOptional()
  @IsIn(['OPEN', 'IN_REVIEW', 'ANSWERED', 'CLOSED'])
  status?: 'OPEN' | 'IN_REVIEW' | 'ANSWERED' | 'CLOSED';
}


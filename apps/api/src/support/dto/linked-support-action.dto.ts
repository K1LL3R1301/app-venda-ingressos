import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class LinkedSupportMessageDto {
  @IsString()
  @MinLength(1)
  message: string;

  @IsOptional()
  @IsIn(['ALL', 'CUSTOMER', 'PRODUCER', 'OPERATOR', 'SUPER_ADMIN'])
  targetType?: string;

  @IsOptional()
  @IsBoolean()
  internal?: boolean;
}

export class LinkedSupportForwardDto {
  @IsString()
  @MinLength(3)
  reason: string;
}

export class LinkedSupportReturnDto {
  @IsIn(['PRODUCER', 'OPERATOR', 'CUSTOMER'])
  target: 'PRODUCER' | 'OPERATOR' | 'CUSTOMER';

  @IsString()
  @MinLength(3)
  response: string;
}

export class LinkedSupportResolveDto {
  @IsString()
  @MinLength(3)
  response: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsIn(['ALL', 'CUSTOMER', 'PRODUCER', 'OPERATOR', 'SUPER_ADMIN'])
  targetType?: string;
}
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLinkedSupportThreadDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(3)
  message: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @IsOptional()
  @IsIn(['CUSTOMER', 'PRODUCER', 'OPERATOR', 'SUPER_ADMIN'])
  sourceType?: string;

  @IsOptional()
  @IsIn(['CUSTOMER', 'PRODUCER', 'OPERATOR', 'SUPER_ADMIN'])
  currentOwnerType?: string;

  @IsOptional()
  @IsIn(['ALL', 'CUSTOMER', 'PRODUCER', 'OPERATOR', 'SUPER_ADMIN'])
  targetType?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  producerUserId?: string;

  @IsOptional()
  @IsString()
  producerName?: string;

  @IsOptional()
  @IsEmail()
  producerEmail?: string;

  @IsOptional()
  @IsString()
  operatorUserId?: string;

  @IsOptional()
  @IsString()
  operatorName?: string;

  @IsOptional()
  @IsEmail()
  operatorEmail?: string;
}
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsString,
  Length,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Transform(({ value }) => String(value || '').trim())
  name: string;

  @IsEmail()
  @Transform(({ value }) => String(value || '').trim().toLowerCase())
  email: string;

  @ValidateIf((object: CreateUserDto) => object.role === 'CUSTOMER' || !!object.cpf)
  @IsString()
  @Transform(({ value }) => String(value || '').replace(/\D/g, ''))
  @Length(11, 11, { message: 'CPF deve ter 11 dígitos' })
  cpf?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsIn(['ADMIN', 'OPERATOR', 'CUSTOMER'])
  role: string;
}
import { Transform } from 'class-transformer';
import { IsString, Length, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @Transform(({ value }) => String(value || '').replace(/\D/g, ''))
  @Length(11, 11, { message: 'CPF deve ter 11 dígitos' })
  cpf: string;

  @IsString()
  @MinLength(6)
  password: string;
}
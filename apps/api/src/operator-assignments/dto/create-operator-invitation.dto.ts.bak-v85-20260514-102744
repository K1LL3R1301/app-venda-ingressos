import { IsOptional, IsString, Length } from 'class-validator';

export class CreateOperatorInvitationDto {
  @IsString()
  @Length(11, 14)
  cpf!: string;

  @IsOptional()
  @IsString()
  message?: string;
}

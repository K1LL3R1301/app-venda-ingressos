import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

function normalizeCpf(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(data: LoginDto) {
    const cpfNormalized = normalizeCpf(data.cpf);

    const user = await this.prisma.user.findUnique({
      where: { cpfNormalized },
    });

    if (!user) {
      throw new UnauthorizedException('CPF ou senha inválidos');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuário inativo');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Esta conta não possui senha cadastrada. Use o login social quando ele estiver disponível.',
      );
    }

    const passwordMatches = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('CPF ou senha inválidos');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      cpf: user.cpfNormalized,
      role: user.role,
      authProvider: user.authProvider,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
        status: user.status,
        authProvider: user.authProvider,
      },
    };
  }
}
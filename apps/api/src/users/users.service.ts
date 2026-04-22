import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

function normalizeCpf(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    const normalizedEmail = String(data.email || '').trim().toLowerCase();
    const normalizedCpf = normalizeCpf(data.cpf);

    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUserByEmail) {
      throw new ConflictException('Já existe um usuário com este email');
    }

    if (normalizedCpf) {
      const existingUserByCpf = await this.prisma.user.findUnique({
        where: { cpfNormalized: normalizedCpf },
      });

      if (existingUserByCpf) {
        throw new ConflictException('Já existe um usuário com este CPF');
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        name: data.name,
        email: normalizedEmail,
        cpf: normalizedCpf || null,
        cpfNormalized: normalizedCpf || null,
        passwordHash,
        authProvider: 'PASSWORD',
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        authProvider: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        authProvider: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        authProvider: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(id: string, data: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (data.email && data.email !== existingUser.email) {
      const emailInUse = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailInUse) {
        throw new ConflictException('Já existe um usuário com este email');
      }
    }

    let passwordHash: string | undefined;

    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        authProvider: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getWalletSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const transactions = await this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let balance = new Prisma.Decimal(0);

    for (const transaction of transactions) {
      if (transaction.type === 'DEBIT') {
        balance = balance.sub(transaction.amount);
      } else {
        balance = balance.add(transaction.amount);
      }
    }

    return {
      user,
      balance,
      transactions,
    };
  }
}
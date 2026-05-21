import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
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

  private calculateWalletBalanceFromTransactions(
    transactions: Array<{ type: string; amount: Prisma.Decimal }>,
  ) {
    let balance = new Prisma.Decimal(0);

    for (const transaction of transactions) {
      if (transaction.type === 'DEBIT') {
        balance = balance.sub(transaction.amount);
      } else {
        balance = balance.add(transaction.amount);
      }
    }

    return balance;
  }

  async requestWalletBankWithdrawal(
    userId: string,
    body?: { amount?: string | number; bankPixKey?: string; bankAccountLabel?: string },
  ) {
    let grossAmount: Prisma.Decimal;

    try {
      grossAmount = new Prisma.Decimal(
        String(body?.amount ?? '0').replace(',', '.'),
      );
    } catch {
      throw new BadRequestException('Valor de saque invalido');
    }

    if (grossAmount.lte(0)) {
      throw new BadRequestException('Valor de saque deve ser maior que zero');
    }

    const withdrawalId = crypto.randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
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

      const transactions = await tx.walletTransaction.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const balanceBefore = this.calculateWalletBalanceFromTransactions(transactions);

      if (grossAmount.gt(balanceBefore)) {
        throw new BadRequestException('Saldo insuficiente na wallet para este saque');
      }

      // Regra de negocio:
      // Cancelamento devolve 80% do ingresso para a wallet.
      // Ao sacar para banco, retem mais 20% do valor original.
      // Como a wallet ja representa 80% do original, o banco recebe 75% do saldo sacado.
      // Exemplo: ingresso 80 -> wallet 64 -> banco 48 -> taxa 16.
      const feeAmount = grossAmount.mul(new Prisma.Decimal(0.25));
      const bankAmount = grossAmount.sub(feeAmount);
      const balanceAfter = balanceBefore.sub(grossAmount);
      const destination = String(
        body?.bankPixKey || body?.bankAccountLabel || 'nao informado',
      ).trim();

      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          type: 'DEBIT',
          source: 'WALLET_BANK_WITHDRAWAL',
          sourceId: withdrawalId,
          amount: grossAmount,
          description:
            `Saque da wallet para banco solicitado. ` +
            `Valor debitado da wallet: ${grossAmount.toFixed(2)}. ` +
            `Taxa de retirada: ${feeAmount.toFixed(2)}. ` +
            `Valor enviado ao banco: ${bankAmount.toFixed(2)}. ` +
            `Destino: ${destination}.`,
        },
      });

      return {
        id: withdrawalId,
        status: 'REQUESTED',
        user,
        grossAmount,
        feeAmount,
        bankAmount,
        balanceBefore,
        balanceAfter,
        walletDebitPercent: '100%',
        bankPercentOfWallet: '75%',
        feePercentOfWallet: '25%',
        businessRule:
          'Cancelamento credita 80% na wallet; saque envia 75% desse credito ao banco, equivalente a 60% do valor original.',
        transaction,
      };
    });
  }

}
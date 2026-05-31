import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { decimalToNumber, toDecimal } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerDirection } from './agripay.constants';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWallet(userId: string) {
    return this.prisma.userWallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async credit(
    userId: string,
    amount: number,
    type: string,
    orderId?: string,
    reference?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    const wallet = await this.getOrCreateWallet(userId);
    const amountDec = toDecimal(amount);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.userWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amountDec } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: amountDec,
          direction: LedgerDirection.CREDIT,
          type,
          orderId,
          reference,
          metadata,
        },
      });

      return {
        balance: decimalToNumber(updated.balance),
        currency: updated.currency,
      };
    });
  }

  async getWalletSummary(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const recent = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      balance: decimalToNumber(wallet.balance),
      currency: wallet.currency,
      transactions: recent.map((t) => ({
        id: t.id,
        amount: decimalToNumber(t.amount),
        direction: t.direction,
        type: t.type,
        orderId: t.orderId,
        reference: t.reference,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }
}

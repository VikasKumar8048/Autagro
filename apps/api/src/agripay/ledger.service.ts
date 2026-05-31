import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { decimalToNumber, toDecimal } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerDirection, LedgerEntryType } from './agripay.constants';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async appendEntry(
    escrowId: string,
    entryType: string,
    amount: number,
    direction: string,
    reference?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    const entry = await this.prisma.ledgerEntry.create({
      data: {
        escrowId,
        entryType,
        amount: toDecimal(amount),
        direction,
        reference,
        metadata,
      },
    });
    return {
      id: entry.id,
      entryType: entry.entryType,
      amount: decimalToNumber(entry.amount),
      direction: entry.direction,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  async getEscrowLedger(escrowId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { escrowId },
      orderBy: { createdAt: 'asc' },
    });
    return entries.map((e) => ({
      id: e.id,
      entryType: e.entryType,
      amount: decimalToNumber(e.amount),
      direction: e.direction,
      reference: e.reference,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  /** Verify double-entry balance: total debits === total credits for escrow */
  async assertBalanced(escrowId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({ where: { escrowId } });
    let debits = 0;
    let credits = 0;
    for (const e of entries) {
      const amt = decimalToNumber(e.amount);
      if (e.direction === LedgerDirection.DEBIT) debits += amt;
      else credits += amt;
    }
    if (Math.abs(debits - credits) > 0.01) {
      throw new Error(`Escrow ledger imbalanced: debits=${debits} credits=${credits}`);
    }
  }
}

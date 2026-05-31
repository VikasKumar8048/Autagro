import { EscrowService } from './escrow.service';
import { PLATFORM_FEE_PERCENT } from './agripay.constants';
import { Prisma } from '@prisma/client';

describe('EscrowService', () => {
  const ledger = { appendEntry: jest.fn(), getEscrowLedger: jest.fn(), assertBalanced: jest.fn() };
  const wallet = { credit: jest.fn() };
  const prisma = {};

  const service = new EscrowService(
    prisma as never,
    ledger as never,
    wallet as never,
  );

  it('calculates platform fee from crop amount', () => {
    const breakdown = service.calculateBreakdown({
      cropAmount: new Prisma.Decimal(100000),
      transportFee: new Prisma.Decimal(10000),
      platformFee: null,
    });
    expect(breakdown.cropAmount).toBe(100000);
    expect(breakdown.transportAmount).toBe(10000);
    expect(breakdown.platformAmount).toBe(
      Math.round(((100000 * PLATFORM_FEE_PERCENT) / 100) * 100) / 100,
    );
    expect(breakdown.totalAmount).toBe(
      breakdown.cropAmount + breakdown.transportAmount + breakdown.platformAmount,
    );
  });
});

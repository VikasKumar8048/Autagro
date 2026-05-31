import { Prisma } from '@prisma/client';

export function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

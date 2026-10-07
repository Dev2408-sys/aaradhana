import { Prisma } from '@prisma/client';

export function d(value: number | string | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function zero(): Prisma.Decimal {
  return new Prisma.Decimal(0);
}

export function moneyNumber(value: Prisma.Decimal | null | undefined): number {
  if (!value) return 0;
  return Number(value.toFixed(2));
}

export function assertPositiveMoney(value: Prisma.Decimal, label = 'Amount') {
  if (!value.isFinite() || value.lte(0)) {
    throw new Error(`${label} must be a positive decimal`);
  }
}

/** DEBIT increases balance; CREDIT decreases (seller→admin outstanding). */
export function applyLedgerDelta(
  balance: Prisma.Decimal,
  direction: 'DEBIT' | 'CREDIT',
  amount: Prisma.Decimal,
): Prisma.Decimal {
  return direction === 'DEBIT' ? balance.plus(amount) : balance.minus(amount);
}

export function clampNonNegative(value: Prisma.Decimal): Prisma.Decimal {
  return value.lt(0) ? zero() : value;
}

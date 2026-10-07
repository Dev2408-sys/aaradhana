import { LedgerDirection, LedgerEntryType, Prisma, PrismaClient } from '@prisma/client';
import { applyLedgerDelta, d, moneyNumber, zero } from '../utils/money';
import { ValidationAppError } from '../utils/errors';

type Tx = Prisma.TransactionClient | PrismaClient;

export function saleDebitReference(saleId: string) {
  return `SALE_DEBIT:${saleId}`;
}

export function paymentCreditReference(paymentId: string) {
  return `PAYMENT_CREDIT:${paymentId}`;
}

export function paymentReversalReference(paymentId: string) {
  return `REVERSAL_DEBIT:${paymentId}`;
}

export async function getSellerOutstandingBalance(tx: Tx, sellerId: string) {
  const entries = await tx.sellerLedgerEntry.findMany({
    where: { sellerId },
    select: { direction: true, amount: true },
  });

  let balance = zero();
  for (const e of entries) {
    balance = applyLedgerDelta(balance, e.direction, e.amount);
  }
  return balance;
}

export async function appendLedgerEntry(
  tx: Tx,
  input: {
    sellerId: string;
    saleId?: string | null;
    sellerPaymentId?: string | null;
    entryType: LedgerEntryType;
    direction: LedgerDirection;
    amount: Prisma.Decimal;
    reference: string;
    description: string;
    createdByUserId: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  if (!input.amount.isFinite() || input.amount.lte(0)) {
    throw new ValidationAppError('Ledger amount must be positive');
  }

  const existing = await tx.sellerLedgerEntry.findUnique({
    where: { reference: input.reference },
  });
  if (existing) {
    return { entry: existing, created: false };
  }

  const current = await getSellerOutstandingBalance(tx, input.sellerId);
  const balanceAfter = applyLedgerDelta(current, input.direction, input.amount);

  const entry = await tx.sellerLedgerEntry.create({
    data: {
      sellerId: input.sellerId,
      saleId: input.saleId ?? null,
      sellerPaymentId: input.sellerPaymentId ?? null,
      entryType: input.entryType,
      direction: input.direction,
      amount: input.amount,
      balanceAfter,
      reference: input.reference,
      description: input.description,
      metadata: input.metadata,
      createdByUserId: input.createdByUserId,
    },
  });

  return { entry, created: true };
}

/** Canonical SALE_DEBIT for admin base receivable. Idempotent via reference. */
export async function postSaleDebit(
  tx: Tx,
  input: {
    sellerId: string;
    saleId: string;
    saleNumber: string;
    baseAmount: Prisma.Decimal;
    createdByUserId: string;
  },
) {
  return appendLedgerEntry(tx, {
    sellerId: input.sellerId,
    saleId: input.saleId,
    entryType: 'SALE_DEBIT',
    direction: 'DEBIT',
    amount: input.baseAmount,
    reference: saleDebitReference(input.saleId),
    description: `Admin receivable for sale ${input.saleNumber}`,
    createdByUserId: input.createdByUserId,
    metadata: {
      saleNumber: input.saleNumber,
      baseAmount: moneyNumber(input.baseAmount),
    },
  });
}

export async function postSellerPaymentCredit(
  tx: Tx,
  input: {
    sellerId: string;
    sellerPaymentId: string;
    amount: Prisma.Decimal;
    createdByUserId: string;
  },
) {
  return appendLedgerEntry(tx, {
    sellerId: input.sellerId,
    sellerPaymentId: input.sellerPaymentId,
    entryType: 'PAYMENT_CREDIT',
    direction: 'CREDIT',
    amount: input.amount,
    reference: paymentCreditReference(input.sellerPaymentId),
    description: `Seller settlement payment ${input.sellerPaymentId}`,
    createdByUserId: input.createdByUserId,
  });
}

export async function postSellerPaymentReversal(
  tx: Tx,
  input: {
    sellerId: string;
    sellerPaymentId: string;
    amount: Prisma.Decimal;
    createdByUserId: string;
  },
) {
  return appendLedgerEntry(tx, {
    sellerId: input.sellerId,
    sellerPaymentId: input.sellerPaymentId,
    entryType: 'REVERSAL_DEBIT',
    direction: 'DEBIT',
    amount: input.amount,
    reference: paymentReversalReference(input.sellerPaymentId),
    description: `Reversal of seller payment ${input.sellerPaymentId}`,
    createdByUserId: input.createdByUserId,
  });
}

/**
 * FIFO update of per-sale settlementStatus from seller-level paid amount.
 * PENDING ≈ unsettled, PARTIAL ≈ partially settled, PAID ≈ settled.
 */
export async function recomputeSaleSettlementStatuses(tx: Tx, sellerId: string) {
  const outstanding = await getSellerOutstandingBalance(tx, sellerId);
  const sales = await tx.sale.findMany({
    where: { sellerId, saleStatus: 'CONFIRMED' },
    orderBy: { soldAt: 'asc' },
    select: { id: true, baseAmount: true },
  });

  const totalBase = sales.reduce((acc, s) => acc.plus(s.baseAmount), zero());
  let remainingPaid = totalBase.minus(outstanding);
  if (remainingPaid.lt(0)) remainingPaid = zero();

  for (const sale of sales) {
    let status: 'PENDING' | 'PARTIAL' | 'PAID' = 'PENDING';
    if (remainingPaid.gte(sale.baseAmount)) {
      status = 'PAID';
      remainingPaid = remainingPaid.minus(sale.baseAmount);
    } else if (remainingPaid.gt(0)) {
      status = 'PARTIAL';
      remainingPaid = zero();
    }

    await tx.sale.update({
      where: { id: sale.id },
      data: { settlementStatus: status },
    });
  }
}

export function toMoney(value: number | string | Prisma.Decimal) {
  return d(value);
}

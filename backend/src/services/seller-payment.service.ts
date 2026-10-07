import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationAppError,
} from '../utils/errors';
import { d, moneyNumber } from '../utils/money';
import {
  assertSellerFinanceAccess,
  isAdmin,
  resolveSellerIdForActor,
} from './accounting-access.service';
import { createAuditLog } from './audit.service';
import {
  postSellerPaymentCredit,
  postSellerPaymentReversal,
  recomputeSaleSettlementStatuses,
} from './ledger.service';
import { createNotification, createNotifications } from './notification.service';
import { assertUtrIfRequired } from './payment-settings.service';

const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'] as const;

function mapSellerPayment(p: {
  id: string;
  sellerId: string;
  amount: Prisma.Decimal;
  paymentMethod: string;
  transactionReference: string | null;
  notes: string | null;
  status: string;
  paymentDate: Date;
  recordedBy: string;
  reversedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  seller?: { id: string; sellerCode: string; user: { name: string } };
}) {
  return {
    id: p.id,
    sellerId: p.sellerId,
    amount: moneyNumber(p.amount),
    paymentMethod: p.paymentMethod,
    transactionReference: p.transactionReference,
    notes: p.notes,
    status: p.status,
    paymentDate: p.paymentDate,
    recordedBy: p.recordedBy,
    reversedAt: p.reversedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    seller: p.seller
      ? {
          id: p.seller.id,
          sellerCode: p.seller.sellerCode,
          name: p.seller.user.name,
        }
      : undefined,
  };
}

export async function createSellerPayment(
  actor: AuthUser,
  input: {
    sellerId?: string;
    amount: number;
    paymentMethod: (typeof PAYMENT_METHODS)[number];
    paymentReference?: string | null;
    notes?: string | null;
    idempotencyKey?: string | null;
    paymentDate?: string;
  },
  ipAddress?: string,
) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new ValidationAppError('Payment amount must be a positive number');
  }
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
    throw new ValidationAppError('Invalid payment method');
  }

  await assertUtrIfRequired(input.paymentMethod, input.paymentReference);

  const sellerId = resolveSellerIdForActor(actor, input.sellerId);
  const amount = d(input.amount);

  if (input.idempotencyKey) {
    const existing = await prisma.sellerPayment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { seller: { include: { user: { select: { name: true } } } } },
    });
    if (existing) return mapSellerPayment(existing);
  }

  const paymentId = await prisma.$transaction(async (tx) => {
    const seller = await tx.sellerProfile.findUnique({
      where: { id: sellerId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!seller) throw new NotFoundError('Seller not found');

    if (input.paymentReference) {
      const dup = await tx.sellerPayment.findFirst({
        where: {
          sellerId,
          paymentMethod: input.paymentMethod,
          transactionReference: input.paymentReference,
          status: 'RECORDED',
        },
      });
      if (dup) {
        throw new ConflictError('Duplicate payment reference for this seller and method');
      }
    }

    const payment = await tx.sellerPayment.create({
      data: {
        sellerId,
        amount,
        paymentMethod: input.paymentMethod,
        transactionReference: input.paymentReference ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
        notes: input.notes ?? null,
        status: 'RECORDED',
        recordedBy: actor.id,
      },
    });

    await postSellerPaymentCredit(tx, {
      sellerId,
      sellerPaymentId: payment.id,
      amount,
      createdByUserId: actor.id,
    });

    await recomputeSaleSettlementStatuses(tx, sellerId);

    await createAuditLog(
      {
        userId: actor.id,
        action: 'SELLER_PAYMENT_CREATED',
        entityType: 'seller_payment',
        entityId: payment.id,
        newValue: {
          sellerId,
          amount: moneyNumber(amount),
          paymentMethod: input.paymentMethod,
        },
        ipAddress,
      },
      tx,
    );

    const admins = await tx.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, status: 'ACTIVE' },
      select: { id: true },
    });

    await createNotifications(tx, [
      {
        recipientUserId: seller.userId,
        type: 'SELLER_PAYMENT_RECEIVED',
        title: 'Settlement Recorded',
        message: `₹${moneyNumber(amount)} settlement payment was recorded.`,
        entityType: 'seller_payment',
        entityId: payment.id,
      },
      ...admins.map((a) => ({
        recipientUserId: a.id,
        type: 'SELLER_PAYMENT_RECEIVED' as const,
        title: 'Seller Settlement Received',
        message: `${seller.user.name} settled ₹${moneyNumber(amount)}.`,
        entityType: 'seller_payment',
        entityId: payment.id,
      })),
    ]);

    return payment.id;
  }, { maxWait: 30000, timeout: 60000 });

  const created = await prisma.sellerPayment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { seller: { include: { user: { select: { name: true } } } } },
  });
  return mapSellerPayment(created);
}

export async function reverseSellerPayment(
  actor: AuthUser,
  paymentId: string,
  ipAddress?: string,
) {
  if (!isAdmin(actor)) {
    // Sellers may reverse only their own recorded payments
  }

  const resultId = await prisma.$transaction(async (tx) => {
    const payment = await tx.sellerPayment.findUnique({
      where: { id: paymentId },
      include: { seller: { select: { userId: true } } },
    });
    if (!payment) throw new NotFoundError('Seller payment not found');
    assertSellerFinanceAccess(actor, payment.sellerId);

    if (payment.status === 'REVERSED') {
      throw new ValidationAppError('Payment already reversed');
    }

    await tx.sellerPayment.update({
      where: { id: payment.id },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversedByUserId: actor.id,
      },
    });

    await postSellerPaymentReversal(tx, {
      sellerId: payment.sellerId,
      sellerPaymentId: payment.id,
      amount: payment.amount,
      createdByUserId: actor.id,
    });

    await recomputeSaleSettlementStatuses(tx, payment.sellerId);

    await createAuditLog(
      {
        userId: actor.id,
        action: 'SELLER_PAYMENT_REVERSED',
        entityType: 'seller_payment',
        entityId: payment.id,
        newValue: { amount: moneyNumber(payment.amount) },
        ipAddress,
      },
      tx,
    );

    await createNotification(tx, {
      recipientUserId: payment.seller.userId,
      type: 'PAYMENT_REVERSED',
      title: 'Settlement Reversed',
      message: `₹${moneyNumber(payment.amount)} settlement payment was reversed.`,
      entityType: 'seller_payment',
      entityId: payment.id,
    });

    return payment.id;
  });

  const updated = await prisma.sellerPayment.findUniqueOrThrow({
    where: { id: resultId },
    include: { seller: { include: { user: { select: { name: true } } } } },
  });
  return mapSellerPayment(updated);
}

export async function listSellerPayments(
  actor: AuthUser,
  query: {
    page?: number;
    pageSize?: number;
    sellerId?: string;
    status?: 'RECORDED' | 'REVERSED';
  },
) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const where: Prisma.SellerPaymentWhereInput = {};

  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId) throw new ForbiddenError();
    where.sellerId = actor.sellerProfileId;
  } else if (query.sellerId) {
    where.sellerId = query.sellerId;
  }

  if (query.status) where.status = query.status;

  const [total, rows] = await Promise.all([
    prisma.sellerPayment.count({ where }),
    prisma.sellerPayment.findMany({
      where,
      include: { seller: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(mapSellerPayment),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getSellerPaymentById(actor: AuthUser, id: string) {
  const payment = await prisma.sellerPayment.findUnique({
    where: { id },
    include: { seller: { include: { user: { select: { name: true } } } } },
  });
  if (!payment) throw new NotFoundError('Seller payment not found');
  assertSellerFinanceAccess(actor, payment.sellerId);
  return mapSellerPayment(payment);
}

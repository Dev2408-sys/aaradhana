import { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationAppError,
} from '../utils/errors';
import { clampNonNegative, d, moneyNumber, zero } from '../utils/money';
import { createAuditLog } from './audit.service';
import { isAdmin } from './accounting-access.service';
import { createNotification, createNotifications } from './notification.service';
import { transferTicketsAfterPayment } from './sale-workflow.service';
import { assertUtrIfRequired } from './payment-settings.service';

const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'] as const;

function mapPayment(p: {
  id: string;
  customerId: string;
  saleId: string;
  amount: Prisma.Decimal;
  paymentMethod: string;
  paymentReference: string | null;
  notes: string | null;
  status: string;
  receivedByUserId: string;
  reversedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: { id: string; name: string; mobile: string };
  sale?: { id: string; saleNumber: string; sellerId: string };
}) {
  return {
    id: p.id,
    customerId: p.customerId,
    saleId: p.saleId,
    amount: moneyNumber(p.amount),
    paymentMethod: p.paymentMethod,
    paymentReference: p.paymentReference,
    notes: p.notes,
    status: p.status,
    receivedByUserId: p.receivedByUserId,
    reversedAt: p.reversedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    customer: p.customer,
    sale: p.sale
      ? {
          id: p.sale.id,
          saleNumber: p.sale.saleNumber,
          sellerId: p.sale.sellerId,
        }
      : undefined,
  };
}

export async function sumCustomerPaidForSale(
  tx: Prisma.TransactionClient | typeof prisma,
  saleId: string,
) {
  const agg = await tx.customerPayment.aggregate({
    where: { saleId, status: 'RECORDED' },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? zero();
}

export function deriveCustomerPaymentStatus(
  saleTotal: Prisma.Decimal,
  paid: Prisma.Decimal,
): PaymentStatus {
  if (paid.lte(0)) return 'PENDING';
  if (paid.lt(saleTotal)) return 'PARTIAL';
  if (paid.eq(saleTotal)) return 'PAID';
  return 'OVERPAID';
}

export async function calculateSaleCustomerOutstanding(saleId: string) {
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) throw new NotFoundError('Sale not found');
  const paid = await sumCustomerPaidForSale(prisma, saleId);
  const outstanding = sale.totalAmount.minus(paid);
  return {
    saleId: sale.id,
    saleNumber: sale.saleNumber,
    saleTotal: moneyNumber(sale.totalAmount),
    paidAmount: moneyNumber(paid),
    outstanding: moneyNumber(clampNonNegative(outstanding)),
    paymentStatus: deriveCustomerPaymentStatus(sale.totalAmount, paid),
    saleStatus: sale.saleStatus,
  };
}

export async function calculateCustomerOutstanding(customerId: string) {
  const sales = await prisma.sale.findMany({
    where: { customerId, saleStatus: 'CONFIRMED' },
    select: { id: true, totalAmount: true },
  });
  let billed = zero();
  let paid = zero();
  for (const sale of sales) {
    billed = billed.plus(sale.totalAmount);
    paid = paid.plus(await sumCustomerPaidForSale(prisma, sale.id));
  }
  return {
    customerId,
    saleCount: sales.length,
    totalBilled: moneyNumber(billed),
    totalPaid: moneyNumber(paid),
    totalOutstanding: moneyNumber(clampNonNegative(billed.minus(paid))),
  };
}

async function assertSalePaymentAccess(actor: AuthUser, sellerId: string) {
  if (isAdmin(actor)) return;
  if (!actor.sellerProfileId || actor.sellerProfileId !== sellerId) {
    throw new ForbiddenError('You cannot manage payments for this sale');
  }
}

export async function createCustomerPayment(
  actor: AuthUser,
  input: {
    saleId: string;
    amount: number;
    paymentMethod: (typeof PAYMENT_METHODS)[number];
    paymentReference?: string | null;
    notes?: string | null;
    idempotencyKey?: string | null;
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

  const amount = d(input.amount);

  if (input.idempotencyKey) {
    const existing = await prisma.customerPayment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: {
        customer: { select: { id: true, name: true, mobile: true } },
        sale: { select: { id: true, saleNumber: true, sellerId: true } },
      },
    });
    if (existing) return mapPayment(existing);
  }

  const paymentId = await prisma.$transaction(async (tx) => {
    const saleRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM sales WHERE id = ${input.saleId}::uuid FOR UPDATE
    `;
    if (!saleRows.length) throw new NotFoundError('Sale not found');

    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: input.saleId },
      include: {
        seller: { select: { id: true, userId: true, user: { select: { name: true } } } },
        customer: true,
      },
    });

    await assertSalePaymentAccess(actor, sale.sellerId);

    if (sale.saleStatus === 'PENDING') {
      throw new ValidationAppError(
        'Sale is awaiting admin approval — payments can be recorded after approval',
      );
    }
    if (sale.saleStatus === 'CANCELLED' || sale.saleStatus === 'REFUNDED') {
      throw new ValidationAppError('Cannot record payment against a cancelled/refunded sale');
    }

    if (input.paymentReference) {
      const dup = await tx.customerPayment.findFirst({
        where: {
          saleId: sale.id,
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference,
          status: 'RECORDED',
        },
      });
      if (dup) {
        throw new ConflictError('Duplicate payment reference for this sale and method');
      }
    }

    const paid = await sumCustomerPaidForSale(tx, sale.id);
    const outstanding = sale.totalAmount.minus(paid);
    if (amount.gt(outstanding)) {
      throw new ValidationAppError(
        `Payment exceeds outstanding (${moneyNumber(outstanding)})`,
      );
    }

    const payment = await tx.customerPayment.create({
      data: {
        customerId: sale.customerId,
        saleId: sale.id,
        amount,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        notes: input.notes ?? null,
        status: 'RECORDED',
        receivedByUserId: actor.id,
      },
    });

    const newPaid = paid.plus(amount);
    const paymentStatus = deriveCustomerPaymentStatus(sale.totalAmount, newPaid);

    await tx.sale.update({
      where: { id: sale.id },
      data: { paymentStatus },
    });

    if (paymentStatus === 'PAID') {
      await transferTicketsAfterPayment(tx, sale.id);
    }

    await createAuditLog(
      {
        userId: actor.id,
        action: 'CUSTOMER_PAYMENT_CREATED',
        entityType: 'customer_payment',
        entityId: payment.id,
        newValue: {
          saleId: sale.id,
          amount: moneyNumber(amount),
          paymentMethod: input.paymentMethod,
          paymentStatus,
        },
        ipAddress,
      },
      tx,
    );

    await createNotification(tx, {
      recipientUserId: sale.seller.userId,
      type: 'PAYMENT_RECEIVED',
      title: 'Customer Payment Received',
      message: `₹${moneyNumber(amount)} received for sale ${sale.saleNumber}.`,
      entityType: 'customer_payment',
      entityId: payment.id,
    });

    return payment.id;
  });

  const created = await prisma.customerPayment.findUniqueOrThrow({
    where: { id: paymentId },
    include: {
      customer: { select: { id: true, name: true, mobile: true } },
      sale: { select: { id: true, saleNumber: true, sellerId: true } },
    },
  });
  return mapPayment(created);
}

export async function reverseCustomerPayment(
  actor: AuthUser,
  paymentId: string,
  ipAddress?: string,
) {
  const resultId = await prisma.$transaction(async (tx) => {
    const payment = await tx.customerPayment.findUnique({
      where: { id: paymentId },
      include: {
        sale: {
          include: {
            seller: { select: { userId: true } },
          },
        },
      },
    });
    if (!payment) throw new NotFoundError('Payment not found');
    await assertSalePaymentAccess(actor, payment.sale.sellerId);

    if (payment.status === 'REVERSED') {
      throw new ValidationAppError('Payment already reversed');
    }

    await tx.$queryRaw`
      SELECT id FROM sales WHERE id = ${payment.saleId}::uuid FOR UPDATE
    `;

    await tx.customerPayment.update({
      where: { id: payment.id },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversedByUserId: actor.id,
      },
    });

    const paid = await sumCustomerPaidForSale(tx, payment.saleId);
    const sale = await tx.sale.findUniqueOrThrow({ where: { id: payment.saleId } });
    const paymentStatus = deriveCustomerPaymentStatus(sale.totalAmount, paid);
    await tx.sale.update({
      where: { id: sale.id },
      data: { paymentStatus },
    });

    await createAuditLog(
      {
        userId: actor.id,
        action: 'CUSTOMER_PAYMENT_REVERSED',
        entityType: 'customer_payment',
        entityId: payment.id,
        newValue: { amount: moneyNumber(payment.amount), paymentStatus },
        ipAddress,
      },
      tx,
    );

    await createNotification(tx, {
      recipientUserId: payment.sale.seller.userId,
      type: 'PAYMENT_REVERSED',
      title: 'Customer Payment Reversed',
      message: `₹${moneyNumber(payment.amount)} payment reversed for sale ${sale.saleNumber}.`,
      entityType: 'customer_payment',
      entityId: payment.id,
    });

    return payment.id;
  });

  const updated = await prisma.customerPayment.findUniqueOrThrow({
    where: { id: resultId },
    include: {
      customer: { select: { id: true, name: true, mobile: true } },
      sale: { select: { id: true, saleNumber: true, sellerId: true } },
    },
  });
  return mapPayment(updated);
}

export async function listCustomerPayments(
  actor: AuthUser,
  query: {
    page?: number;
    pageSize?: number;
    saleId?: string;
    customerId?: string;
    sellerId?: string;
    eventDay?: number;
    status?: 'RECORDED' | 'REVERSED';
  },
) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const where: Prisma.CustomerPaymentWhereInput = {};

  const saleFilter: Prisma.SaleWhereInput = {};
  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId) throw new ForbiddenError();
    saleFilter.sellerId = actor.sellerProfileId;
  } else if (query.sellerId) {
    saleFilter.sellerId = query.sellerId;
  }
  if (query.eventDay != null) {
    saleFilter.eventDay = query.eventDay;
  }
  if (Object.keys(saleFilter).length > 0) {
    where.sale = saleFilter;
  }

  if (query.saleId) where.saleId = query.saleId;
  if (query.customerId) where.customerId = query.customerId;
  if (query.status) where.status = query.status;

  const [total, rows] = await Promise.all([
    prisma.customerPayment.count({ where }),
    prisma.customerPayment.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, mobile: true } },
        sale: { select: { id: true, saleNumber: true, sellerId: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(mapPayment),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getCustomerPaymentById(actor: AuthUser, id: string) {
  const payment = await prisma.customerPayment.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, mobile: true } },
      sale: { select: { id: true, saleNumber: true, sellerId: true } },
    },
  });
  if (!payment) throw new NotFoundError('Payment not found');
  await assertSalePaymentAccess(actor, payment.sale.sellerId);
  return mapPayment(payment);
}

/** Used inside sale create when customerPaymentStatus=PAID */
export async function recordFullCustomerPaymentInTx(
  tx: Prisma.TransactionClient,
  input: {
    saleId: string;
    customerId: string;
    amount: Prisma.Decimal;
    actorId: string;
    saleNumber: string;
    sellerUserId: string;
  },
) {
  if (input.amount.lte(0)) return null;

  const payment = await tx.customerPayment.create({
    data: {
      customerId: input.customerId,
      saleId: input.saleId,
      amount: input.amount,
      paymentMethod: 'CASH',
      notes: 'Recorded with sale as PAID',
      status: 'RECORDED',
      receivedByUserId: input.actorId,
      idempotencyKey: `SALE_PAID:${input.saleId}`,
    },
  });

  await createAuditLog(
    {
      userId: input.actorId,
      action: 'CUSTOMER_PAYMENT_CREATED',
      entityType: 'customer_payment',
      entityId: payment.id,
      newValue: { saleId: input.saleId, amount: moneyNumber(input.amount), source: 'sale_create' },
    },
    tx,
  );

  await createNotifications(tx, [
    {
      recipientUserId: input.sellerUserId,
      type: 'PAYMENT_RECEIVED',
      title: 'Customer Payment Received',
      message: `Full payment recorded for sale ${input.saleNumber}.`,
      entityType: 'customer_payment',
      entityId: payment.id,
    },
  ]);

  return payment;
}

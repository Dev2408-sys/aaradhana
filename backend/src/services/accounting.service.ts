import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { clampNonNegative, moneyNumber, zero } from '../utils/money';
import {
  assertSellerFinanceAccess,
  isAdmin,
} from './accounting-access.service';
import { createAuditLog } from './audit.service';
import {
  deriveCustomerPaymentStatus,
  sumCustomerPaidForSale,
} from './customer-payment.service';
import {
  getSellerOutstandingBalance,
  postSaleDebit,
  recomputeSaleSettlementStatuses,
} from './ledger.service';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function calculateSellerOutstanding(sellerId: string) {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    include: { user: { select: { name: true, mobile: true } } },
  });
  if (!seller) throw new NotFoundError('Seller not found');

  const salesAgg = await prisma.sale.aggregate({
    where: { sellerId, saleStatus: 'CONFIRMED' },
    _sum: {
      totalAmount: true,
      baseAmount: true,
      sellerProfit: true,
      totalQuantity: true,
    },
    _count: { _all: true },
  });

  const paymentsAgg = await prisma.sellerPayment.aggregate({
    where: { sellerId, status: 'RECORDED' },
    _sum: { amount: true },
  });

  const sales = await prisma.sale.findMany({
    where: { sellerId, saleStatus: 'CONFIRMED' },
    select: { id: true },
  });

  let customerCollected = zero();
  for (const sale of sales) {
    customerCollected = customerCollected.plus(
      await sumCustomerPaidForSale(prisma, sale.id),
    );
  }

  const totalSales = salesAgg._sum.totalAmount ?? zero();
  const adminReceivable = salesAgg._sum.baseAmount ?? zero();
  const sellerGrossMargin = salesAgg._sum.sellerProfit ?? zero();
  const sellerPayments = paymentsAgg._sum.amount ?? zero();
  const outstanding = await getSellerOutstandingBalance(prisma, sellerId);

  const adjustments = await prisma.sellerLedgerEntry.aggregate({
    where: {
      sellerId,
      entryType: { in: ['ADJUSTMENT_DEBIT', 'ADJUSTMENT_CREDIT', 'REFUND_DEBIT'] },
    },
    _sum: { amount: true },
  });

  return {
    seller: {
      id: seller.id,
      sellerCode: seller.sellerCode,
      name: seller.user.name,
      mobile: seller.user.mobile,
    },
    saleCount: salesAgg._count._all,
    ticketsSold: salesAgg._sum.totalQuantity ?? 0,
    totalSales: moneyNumber(totalSales),
    adminReceivable: moneyNumber(adminReceivable),
    sellerGrossMargin: moneyNumber(sellerGrossMargin),
    sellerPayments: moneyNumber(sellerPayments),
    adjustments: moneyNumber(adjustments._sum.amount ?? zero()),
    outstanding: moneyNumber(outstanding),
    customerCollected: moneyNumber(customerCollected),
    customerOutstanding: moneyNumber(clampNonNegative(totalSales.minus(customerCollected))),
  };
}

export async function getSellerFinanceSummary(actor: AuthUser, sellerId: string) {
  assertSellerFinanceAccess(actor, sellerId);
  const base = await calculateSellerOutstanding(sellerId);

  const todayStart = startOfToday();
  const todayAgg = await prisma.sale.aggregate({
    where: {
      sellerId,
      saleStatus: 'CONFIRMED',
      soldAt: { gte: todayStart },
    },
    _sum: {
      totalAmount: true,
      baseAmount: true,
      sellerProfit: true,
      totalQuantity: true,
    },
    _count: { _all: true },
  });

  return {
    ...base,
    today: {
      saleCount: todayAgg._count._all,
      ticketsSold: todayAgg._sum.totalQuantity ?? 0,
      totalSales: moneyNumber(todayAgg._sum.totalAmount ?? zero()),
      adminReceivable: moneyNumber(todayAgg._sum.baseAmount ?? zero()),
      sellerGrossMargin: moneyNumber(todayAgg._sum.sellerProfit ?? zero()),
    },
  };
}

export async function listSellerLedger(
  actor: AuthUser,
  sellerId: string,
  query: { page?: number; pageSize?: number } = {},
) {
  assertSellerFinanceAccess(actor, sellerId);
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 30));

  const where = { sellerId };
  const [total, rows] = await Promise.all([
    prisma.sellerLedgerEntry.count({ where }),
    prisma.sellerLedgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        sale: { select: { id: true, saleNumber: true } },
        sellerPayment: { select: { id: true, paymentMethod: true } },
      },
    }),
  ]);

  return {
    items: rows.map((e) => ({
      id: e.id,
      entryType: e.entryType,
      direction: e.direction,
      amount: moneyNumber(e.amount),
      balanceAfter: moneyNumber(e.balanceAfter),
      reference: e.reference,
      description: e.description,
      sale: e.sale,
      sellerPaymentId: e.sellerPaymentId,
      createdAt: e.createdAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getSaleAccountingSummary(actor: AuthUser, saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: { select: { id: true, name: true, mobile: true } },
      seller: {
        select: { id: true, sellerCode: true, user: { select: { name: true } } },
      },
      items: true,
    },
  });
  if (!sale) throw new NotFoundError('Sale not found');

  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId || sale.sellerId !== actor.sellerProfileId) {
      throw new ForbiddenError('You cannot access this sale accounting');
    }
  }

  const paid = await sumCustomerPaidForSale(prisma, sale.id);
  const itemSelling = sale.items.reduce((a, i) => a.plus(i.sellingPrice), zero());
  const itemBase = sale.items.reduce((a, i) => a.plus(i.basePrice), zero());

  return {
    saleId: sale.id,
    saleNumber: sale.saleNumber,
    seller: {
      id: sale.seller.id,
      sellerCode: sale.seller.sellerCode,
      name: sale.seller.user.name,
    },
    customer: sale.customer,
    saleStatus: sale.saleStatus,
    customerTotal: moneyNumber(sale.totalAmount),
    baseReceivable: moneyNumber(sale.baseAmount),
    sellerGrossMargin: moneyNumber(sale.sellerProfit),
    itemSellingTotal: moneyNumber(itemSelling),
    itemBaseTotal: moneyNumber(itemBase),
    customerPaid: moneyNumber(paid),
    customerOutstanding: moneyNumber(clampNonNegative(sale.totalAmount.minus(paid))),
    customerPaymentStatus: deriveCustomerPaymentStatus(sale.totalAmount, paid),
    settlementStatus: sale.settlementStatus,
    invariants: {
      customerTotalMatchesItems: sale.totalAmount.eq(itemSelling),
      baseMatchesItems: sale.baseAmount.eq(itemBase),
      marginMatches: sale.sellerProfit.eq(sale.totalAmount.minus(sale.baseAmount)),
    },
  };
}

export async function getCustomerAccountingSummary(
  actor: AuthUser,
  customerId: string,
) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new NotFoundError('Customer not found');

  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId) throw new ForbiddenError();
    const owned = await prisma.sale.count({
      where: { customerId, sellerId: actor.sellerProfileId },
    });
    if (!owned) throw new ForbiddenError('You cannot access this customer');
  }

  const salesWhere: Prisma.SaleWhereInput = {
    customerId,
    saleStatus: 'CONFIRMED',
  };
  if (!isAdmin(actor)) {
    salesWhere.sellerId = actor.sellerProfileId!;
  }

  const sales = await prisma.sale.findMany({
    where: salesWhere,
    select: { id: true, totalAmount: true, baseAmount: true, sellerProfit: true },
  });

  let billed = zero();
  let base = zero();
  let margin = zero();
  let paid = zero();
  for (const sale of sales) {
    billed = billed.plus(sale.totalAmount);
    base = base.plus(sale.baseAmount);
    margin = margin.plus(sale.sellerProfit);
    paid = paid.plus(await sumCustomerPaidForSale(prisma, sale.id));
  }

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      mobile: customer.mobile,
    },
    saleCount: sales.length,
    totalBilled: moneyNumber(billed),
    totalBase: moneyNumber(base),
    totalMargin: moneyNumber(margin),
    totalPaid: moneyNumber(paid),
    totalOutstanding: moneyNumber(clampNonNegative(billed.minus(paid))),
  };
}

export async function getAdminReceivableSummary(
  actor: AuthUser,
  query: { eventDay?: number } = {},
) {
  if (!isAdmin(actor)) throw new ForbiddenError();

  const saleWhere: Prisma.SaleWhereInput = { saleStatus: 'CONFIRMED' };
  if (query.eventDay != null) {
    saleWhere.eventDay = query.eventDay;
  }

  const salesAgg = await prisma.sale.aggregate({
    where: saleWhere,
    _sum: {
      totalAmount: true,
      baseAmount: true,
      sellerProfit: true,
      totalQuantity: true,
    },
    _count: { _all: true },
  });

  const customerPaidWhere: Prisma.CustomerPaymentWhereInput = {
    status: 'RECORDED',
  };
  if (query.eventDay != null) {
    customerPaidWhere.sale = { eventDay: query.eventDay };
  }

  const customerPaidAgg = await prisma.customerPayment.aggregate({
    where: customerPaidWhere,
    _sum: { amount: true },
  });

  const reversedCustomer = await prisma.customerPayment.aggregate({
    where: {
      status: 'REVERSED',
      ...(query.eventDay != null ? { sale: { eventDay: query.eventDay } } : {}),
    },
    _sum: { amount: true },
  });

  // Seller settlements are not day-scoped; keep global when no day filter
  let sellerSettled = zero();
  let sellerReversed = zero();
  if (query.eventDay == null) {
    const sellerPaidAgg = await prisma.sellerPayment.aggregate({
      where: { status: 'RECORDED' },
      _sum: { amount: true },
    });
    const reversedSeller = await prisma.sellerPayment.aggregate({
      where: { status: 'REVERSED' },
      _sum: { amount: true },
    });
    sellerSettled = sellerPaidAgg._sum.amount ?? zero();
    sellerReversed = reversedSeller._sum.amount ?? zero();
  }

  const totalSales = salesAgg._sum.totalAmount ?? zero();
  const totalBase = salesAgg._sum.baseAmount ?? zero();
  const totalMargin = salesAgg._sum.sellerProfit ?? zero();
  const customerCollected = customerPaidAgg._sum.amount ?? zero();

  return {
    eventDay: query.eventDay ?? null,
    saleCount: salesAgg._count._all,
    ticketsSold: salesAgg._sum.totalQuantity ?? 0,
    totalSalesAmount: moneyNumber(totalSales),
    totalBaseReceivable: moneyNumber(totalBase),
    totalSellerMargin: moneyNumber(totalMargin),
    totalCustomerCollected: moneyNumber(customerCollected),
    totalSellerSettled: moneyNumber(sellerSettled),
    customerOutstanding: moneyNumber(clampNonNegative(totalSales.minus(customerCollected))),
    sellerOutstanding:
      query.eventDay != null
        ? null
        : moneyNumber(clampNonNegative(totalBase.minus(sellerSettled))),
    refundsReversals: {
      customerPaymentsReversed: moneyNumber(reversedCustomer._sum.amount ?? zero()),
      sellerPaymentsReversed: moneyNumber(sellerReversed),
    },
    netAdminReceivable:
      query.eventDay != null
        ? null
        : moneyNumber(clampNonNegative(totalBase.minus(sellerSettled))),
  };
}

export async function listSellerAccountingRows(
  actor: AuthUser,
  query: { page?: number; pageSize?: number; search?: string } = {},
) {
  if (!isAdmin(actor)) throw new ForbiddenError();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));

  const where: Prisma.SellerProfileWhereInput = {};
  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { sellerCode: { contains: q, mode: 'insensitive' } },
      { user: { name: { contains: q, mode: 'insensitive' } } },
      { user: { mobile: { contains: q } } },
    ];
  }

  const [total, sellers] = await Promise.all([
    prisma.sellerProfile.count({ where }),
    prisma.sellerProfile.findMany({
      where,
      include: { user: { select: { name: true, mobile: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = [];
  for (const s of sellers) {
    const summary = await calculateSellerOutstanding(s.id);
    items.push(summary);
  }

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/** Idempotent backfill of SALE_DEBIT ledger entries for confirmed sales. */
export async function backfillAccounting(actor: AuthUser | null, ipAddress?: string) {
  const sales = await prisma.sale.findMany({
    where: { saleStatus: 'CONFIRMED' },
    select: {
      id: true,
      saleNumber: true,
      sellerId: true,
      baseAmount: true,
    },
    orderBy: { soldAt: 'asc' },
  });

  let created = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    const systemUserId =
      actor?.id ??
      (
        await tx.user.findFirst({
          where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
          select: { id: true },
        })
      )?.id;

    if (!systemUserId) {
      throw new NotFoundError('No admin user available for backfill audit');
    }

    const touchedSellers = new Set<string>();

    for (const sale of sales) {
      const result = await postSaleDebit(tx, {
        sellerId: sale.sellerId,
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        baseAmount: sale.baseAmount,
        createdByUserId: systemUserId,
      });
      if (result.created) {
        created += 1;
        touchedSellers.add(sale.sellerId);
      } else {
        skipped += 1;
      }
    }

    for (const sellerId of touchedSellers) {
      await recomputeSaleSettlementStatuses(tx, sellerId);
    }

    await createAuditLog(
      {
        userId: systemUserId,
        action: 'ACCOUNTING_BACKFILL',
        entityType: 'system',
        entityId: null,
        newValue: { created, skipped, totalSales: sales.length },
        ipAddress,
      },
      tx,
    );
  });

  return { created, skipped, totalSales: sales.length };
}

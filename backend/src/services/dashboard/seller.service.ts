import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { AuthUser } from '../../types/auth-user';
import { ForbiddenError } from '../../utils/errors';
import { suggestNavratriDay } from '../../utils/navratri-days';
import { getTeamSellerIdsIncludingSelf } from '../hierarchy.service';
import { calculateSellerOutstanding } from '../accounting.service';
import {
  buildSaleWhere,
  isAdmin,
  money,
  parseDashboardFilters,
  resolveActiveEvent,
} from './filters';

function requireSeller(actor: AuthUser) {
  if (isAdmin(actor)) throw new ForbiddenError('Use admin dashboard endpoints');
  if (!actor.sellerProfileId) throw new ForbiddenError();
}

async function sumCollected(saleWhere: Prisma.SaleWhereInput) {
  const agg = await prisma.customerPayment.aggregate({
    where: { status: 'RECORDED', sale: saleWhere },
    _sum: { amount: true },
  });
  return money(agg._sum.amount);
}

async function ticketMix(saleWhere: Prisma.SaleWhereInput) {
  const rows = await prisma.saleItem.groupBy({
    by: ['ticketTypeId'],
    where: { sale: saleWhere },
    _count: { _all: true },
  });
  const types = await prisma.ticketType.findMany({
    where: { id: { in: rows.map((r) => r.ticketTypeId) } },
    select: { id: true, code: true },
  });
  const byCode = new Map(types.map((t) => [t.id, t.code]));
  let gold = 0;
  let vip = 0;
  for (const row of rows) {
    const code = byCode.get(row.ticketTypeId);
    if (code === 'GOLD') gold += row._count._all;
    if (code === 'VIP') vip += row._count._all;
  }
  const total = gold + vip;
  return {
    gold,
    vip,
    total,
    goldPercent: total > 0 ? Number(((gold / total) * 100).toFixed(1)) : 0,
    vipPercent: total > 0 ? Number(((vip / total) * 100).toFixed(1)) : 0,
  };
}

export async function getSellerSummary(actor: AuthUser, query: Record<string, unknown>) {
  requireSeller(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const ownWhere = await buildSaleWhere(actor, { ...filters, sellerId: actor.sellerProfileId! }, event.id);

  const todayDay = filters.eventDay ?? suggestNavratriDay();
  const todayWhere: Prisma.SaleWhereInput = {
    ...ownWhere,
    ...(todayDay != null ? { eventDay: todayDay } : {}),
  };

  const [agg, todayAgg, collected, todayCollected, finance] = await Promise.all([
    prisma.sale.aggregate({
      where: ownWhere,
      _sum: {
        totalQuantity: true,
        totalAmount: true,
        baseAmount: true,
        sellerProfit: true,
      },
      _count: { _all: true },
    }),
    prisma.sale.aggregate({
      where: todayWhere,
      _sum: { totalQuantity: true, totalAmount: true },
    }),
    sumCollected(ownWhere),
    sumCollected(todayWhere),
    calculateSellerOutstanding(actor.sellerProfileId!),
  ]);

  const sales = money(agg._sum.totalAmount);
  const todaySales = money(todayAgg._sum.totalAmount);

  return {
    generatedAt: new Date().toISOString(),
    eventDay: filters.eventDay,
    my: {
      todayTickets: todayAgg._sum.totalQuantity ?? 0,
      todaySales,
      todayCollection: todayCollected,
      todayOutstanding: Math.max(0, Number((todaySales - todayCollected).toFixed(2))),
      totalTickets: agg._sum.totalQuantity ?? 0,
      totalSales: sales,
      totalMargin: money(agg._sum.sellerProfit),
      baseAmount: money(agg._sum.baseAmount),
      customerCollection: collected,
      customerOutstanding: Math.max(0, Number((sales - collected).toFixed(2))),
      settlementOutstanding: finance.outstanding,
      sellerSettled: finance.sellerPayments,
    },
  };
}

export async function getSellerDailyPerformance(actor: AuthUser, query: Record<string, unknown>) {
  requireSeller(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(
    actor,
    { ...filters, eventDay: null, sellerId: actor.sellerProfileId! },
    event.id,
  );

  const grouped = await prisma.sale.groupBy({
    by: ['eventDay'],
    where: saleWhere,
    _sum: { totalQuantity: true, totalAmount: true },
  });
  const byDay = new Map(grouped.map((g) => [g.eventDay, g]));

  return {
    days: Array.from({ length: 10 }, (_, i) => {
      const day = i + 1;
      const row = byDay.get(day);
      return {
        dayNumber: day,
        ticketsSold: row?._sum.totalQuantity ?? 0,
        salesValue: money(row?._sum.totalAmount),
      };
    }),
  };
}

export async function getSellerTicketMix(actor: AuthUser, query: Record<string, unknown>) {
  requireSeller(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(
    actor,
    { ...filters, sellerId: actor.sellerProfileId! },
    event.id,
  );
  return ticketMix(saleWhere);
}

export async function getSellerRecentSales(actor: AuthUser, query: Record<string, unknown>) {
  requireSeller(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(
    actor,
    { ...filters, sellerId: actor.sellerProfileId! },
    event.id,
  );

  const sales = await prisma.sale.findMany({
    where: saleWhere,
    orderBy: { createdAt: 'desc' },
    take: Math.min(filters.limit || 15, 50),
    include: {
      customer: { select: { name: true, mobile: true } },
      customerPayments: { where: { status: 'RECORDED' }, select: { amount: true } },
    },
  });

  return {
    items: sales.map((s) => {
      const paid = s.customerPayments.reduce((a, p) => a + Number(p.amount), 0);
      return {
        id: s.id,
        saleNumber: s.saleNumber,
        customerName: s.customer.name,
        tickets: s.totalQuantity,
        amount: money(s.totalAmount),
        paymentStatus: s.paymentStatus,
        eventDay: s.eventDay,
        paid: Number(paid.toFixed(2)),
        createdAt: s.createdAt.toISOString(),
      };
    }),
  };
}

export async function getSellerFinance(actor: AuthUser, query: Record<string, unknown>) {
  requireSeller(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(
    actor,
    { ...filters, sellerId: actor.sellerProfileId! },
    event.id,
  );
  const [agg, collected, finance] = await Promise.all([
    prisma.sale.aggregate({
      where: saleWhere,
      _sum: { totalAmount: true, baseAmount: true, sellerProfit: true, totalQuantity: true },
    }),
    sumCollected(saleWhere),
    calculateSellerOutstanding(actor.sellerProfileId!),
  ]);
  const sales = money(agg._sum.totalAmount);
  return {
    grossSales: sales,
    adminBaseAmount: money(agg._sum.baseAmount),
    grossMargin: money(agg._sum.sellerProfit),
    customerCollection: collected,
    customerOutstanding: Math.max(0, Number((sales - collected).toFixed(2))),
    sellerSettlement: finance.sellerPayments,
    sellerOutstanding: finance.outstanding,
    tickets: agg._sum.totalQuantity ?? 0,
    note:
      filters.eventDay != null
        ? 'Settlement outstanding remains lifetime ledger balance (not day-scoped).'
        : undefined,
  };
}

export async function getMasterSummary(actor: AuthUser, query: Record<string, unknown>) {
  if (actor.role !== 'MASTER_SELLER' || !actor.sellerProfileId) {
    throw new ForbiddenError('Master seller access required');
  }
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const teamIds = await getTeamSellerIdsIncludingSelf(prisma, actor.sellerProfileId);

  const myWhere = await buildSaleWhere(
    actor,
    { ...filters, sellerId: actor.sellerProfileId },
    event.id,
  );
  const teamWhere: Prisma.SaleWhereInput = {
    ...(await buildSaleWhere(actor, { ...filters, sellerId: undefined }, event.id)),
    sellerId: { in: teamIds },
  };

  const [myAgg, teamAgg, teamCollected, activeSellers] = await Promise.all([
    prisma.sale.aggregate({
      where: myWhere,
      _sum: { totalQuantity: true, totalAmount: true },
    }),
    prisma.sale.aggregate({
      where: teamWhere,
      _sum: { totalQuantity: true, totalAmount: true, sellerProfit: true },
    }),
    sumCollected(teamWhere),
    prisma.sellerProfile.count({
      where: { id: { in: teamIds }, activationStatus: 'ACTIVE' },
    }),
  ]);

  const teamSales = money(teamAgg._sum.totalAmount);

  return {
    generatedAt: new Date().toISOString(),
    myTickets: myAgg._sum.totalQuantity ?? 0,
    mySales: money(myAgg._sum.totalAmount),
    teamTickets: teamAgg._sum.totalQuantity ?? 0,
    teamSales,
    teamSellers: teamIds.length,
    activeSellers,
    teamCollection: teamCollected,
    teamOutstanding: Math.max(0, Number((teamSales - teamCollected).toFixed(2))),
    teamMargin: money(teamAgg._sum.sellerProfit),
  };
}

export async function getMasterTeamPerformance(actor: AuthUser, query: Record<string, unknown>) {
  if (actor.role !== 'MASTER_SELLER' || !actor.sellerProfileId) {
    throw new ForbiddenError('Master seller access required');
  }
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const teamIds = await getTeamSellerIdsIncludingSelf(prisma, actor.sellerProfileId);
  const saleWhereBase = await buildSaleWhere(actor, { ...filters, sellerId: undefined }, event.id);

  const grouped = await prisma.sale.groupBy({
    by: ['sellerId'],
    where: { ...saleWhereBase, sellerId: { in: teamIds } },
    _sum: { totalQuantity: true, totalAmount: true },
    _max: { soldAt: true },
    _count: { _all: true },
  });

  grouped.sort((a, b) => (b._sum.totalQuantity ?? 0) - (a._sum.totalQuantity ?? 0));

  const sellers = await prisma.sellerProfile.findMany({
    where: { id: { in: teamIds } },
    include: { user: { select: { name: true } } },
  });
  const map = new Map(sellers.map((s) => [s.id, s]));

  const items = await Promise.all(
    grouped.map(async (row, index) => {
      const s = map.get(row.sellerId);
      const sales = money(row._sum.totalAmount);
      const collected = await sumCollected({
        ...saleWhereBase,
        sellerId: row.sellerId,
      });
      return {
        rank: index + 1,
        sellerId: row.sellerId,
        name: s?.user.name ?? 'Unknown',
        sellerCode: s?.sellerCode ?? '—',
        status: s?.activationStatus ?? '—',
        tickets: row._sum.totalQuantity ?? 0,
        sales,
        collection: collected,
        outstanding: Math.max(0, Number((sales - collected).toFixed(2))),
        lastSaleAt: row._max.soldAt?.toISOString() ?? null,
      };
    }),
  );

  // Include team members with zero sales
  for (const id of teamIds) {
    if (!items.find((i) => i.sellerId === id)) {
      const s = map.get(id);
      items.push({
        rank: items.length + 1,
        sellerId: id,
        name: s?.user.name ?? 'Unknown',
        sellerCode: s?.sellerCode ?? '—',
        status: s?.activationStatus ?? '—',
        tickets: 0,
        sales: 0,
        collection: 0,
        outstanding: 0,
        lastSaleAt: null,
      });
    }
  }

  return { items };
}

import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { AuthUser } from '../../types/auth-user';
import { ForbiddenError } from '../../utils/errors';
import { suggestNavratriDay } from '../../utils/navratri-days';
import { getTeamSellerIdsIncludingSelf } from '../hierarchy.service';
import {
  buildSaleWhere,
  eventLifecycleStatus,
  isAdmin,
  money,
  parseDashboardFilters,
  resolveActiveEvent,
  type DashboardFilters,
} from './filters';

function requireAdmin(actor: AuthUser) {
  if (!isAdmin(actor)) throw new ForbiddenError('Admin access required');
}

async function sumCustomerCollected(saleWhere: Prisma.SaleWhereInput) {
  const agg = await prisma.customerPayment.aggregate({
    where: { status: 'RECORDED', sale: saleWhere },
    _sum: { amount: true },
  });
  return money(agg._sum.amount);
}

async function sumSellerSettled() {
  const [paid, reversed] = await Promise.all([
    prisma.sellerPayment.aggregate({
      where: { status: 'RECORDED' },
      _sum: { amount: true },
    }),
    prisma.sellerPayment.aggregate({
      where: { status: 'REVERSED' },
      _sum: { amount: true },
    }),
  ]);
  return money((paid._sum.amount ?? new Prisma.Decimal(0)).minus(reversed._sum.amount ?? 0));
}

export async function getAdminSummary(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(actor, filters, event.id);

  const todayDay = suggestNavratriDay();
  const todayWhere: Prisma.SaleWhereInput = {
    ...saleWhere,
    ...(todayDay != null ? { eventDay: todayDay } : { soldAt: { gte: startOfTodayIst(), lt: endOfTodayIst() } }),
  };
  // When filtering a specific event day, "today's tickets" for that day means that day's totals
  const todayScoped =
    filters.eventDay != null
      ? saleWhere
      : todayWhere;

  const [agg, todayAgg, customerCollected, sellerSettled, activeSellers, goldVip] =
    await Promise.all([
      prisma.sale.aggregate({
        where: saleWhere,
        _sum: {
          totalQuantity: true,
          totalAmount: true,
          baseAmount: true,
          sellerProfit: true,
        },
        _count: { _all: true },
      }),
      prisma.sale.aggregate({
        where: todayScoped,
        _sum: { totalQuantity: true, totalAmount: true },
        _count: { _all: true },
      }),
      sumCustomerCollected(saleWhere),
      filters.eventDay == null ? sumSellerSettled() : Promise.resolve(null as number | null),
      prisma.sellerProfile.count({ where: { activationStatus: 'ACTIVE' } }),
      ticketMix(saleWhere),
    ]);

  const ticketsSold = agg._sum.totalQuantity ?? 0;
  const salesValue = money(agg._sum.totalAmount);
  const adminReceivable = money(agg._sum.baseAmount);
  const sellerMargin = money(agg._sum.sellerProfit);
  const customerOutstanding = Math.max(0, Number((salesValue - customerCollected).toFixed(2)));
  const sellerOutstanding =
    sellerSettled == null
      ? null
      : Math.max(0, Number((adminReceivable - sellerSettled).toFixed(2)));

  const dailyTarget = event.dailyTarget;
  const eventTarget = dailyTarget * 10;
  const todayTickets = todayAgg._sum.totalQuantity ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    event: mapEventHeader(event),
    filters: {
      eventDay: filters.eventDay,
      sellerId: filters.sellerId ?? null,
      masterSellerId: filters.masterSellerId ?? null,
      ticketTypeId: filters.ticketTypeId ?? null,
      paymentStatus: filters.paymentStatus ?? null,
      settlementStatus: filters.settlementStatus ?? null,
    },
    kpis: {
      totalTicketsSold: ticketsSold,
      todayTickets,
      todayTarget: dailyTarget,
      todayAchievementPercent:
        dailyTarget > 0 ? Number(((todayTickets / dailyTarget) * 100).toFixed(1)) : 0,
      totalSalesValue: salesValue,
      adminReceivable,
      customerCollection: customerCollected,
      customerOutstanding,
      sellerSettlement: sellerSettled,
      sellerOutstanding,
      sellerGrossMargin: sellerMargin,
      activeSellers,
      saleCount: agg._count._all,
      goldTickets: goldVip.gold,
      vipTickets: goldVip.vip,
    },
  };
}

function mapEventHeader(event: {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  venue: string;
  address: string | null;
  dailyTarget: number;
  status: string;
}) {
  const currentDay = suggestNavratriDay();
  return {
    id: event.id,
    name: event.name,
    venue: event.venue,
    address: event.address,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    dailyTarget: event.dailyTarget,
    eventTarget: event.dailyTarget * 10,
    lifecycleStatus: eventLifecycleStatus(event.startDate, event.endDate),
    currentEventDay: currentDay,
    dbStatus: event.status,
  };
}

function startOfTodayIst() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  ist.setHours(0, 0, 0, 0);
  return ist;
}

function endOfTodayIst() {
  const d = startOfTodayIst();
  d.setDate(d.getDate() + 1);
  return d;
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

export async function getAdminTargetProgress(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(actor, filters, event.id);

  const agg = await prisma.sale.aggregate({
    where: saleWhere,
    _sum: { totalQuantity: true },
  });
  const actual = agg._sum.totalQuantity ?? 0;
  const dailyTarget = event.dailyTarget;
  const target = dailyTarget * 10;
  const remaining = Math.max(0, target - actual);
  const achievementPercent = target > 0 ? Number(((actual / target) * 100).toFixed(1)) : 0;

  const currentDay = suggestNavratriDay();
  const daysElapsed = currentDay ?? (eventLifecycleStatus(event.startDate, event.endDate) === 'COMPLETED' ? 10 : 0);
  const daysRemaining = Math.max(0, 10 - (daysElapsed || 0));
  const pace = daysElapsed > 0 ? actual / daysElapsed : 0;
  const projectedFinal = Math.round(pace * 10);
  const requiredDailyPace =
    daysRemaining > 0 ? Number((remaining / daysRemaining).toFixed(1)) : remaining;

  return {
    target,
    actual,
    achievementPercent,
    remaining,
    dailyTarget,
    daysElapsed,
    daysRemaining,
    requiredDailyPace,
    currentPacePerDay: Number(pace.toFixed(1)),
    projectedFinalLabel: 'Current pace projection',
    projectedFinal,
    note: 'Projection is based on average tickets per elapsed event day — not a guarantee.',
  };
}

export async function getAdminDailyPerformance(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  // Daily chart ignores single-day filter so all 10 days show; other filters apply
  const chartFilters: DashboardFilters = { ...filters, eventDay: null, eventDayId: undefined };
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(actor, chartFilters, event.id);

  const grouped = await prisma.sale.groupBy({
    by: ['eventDay'],
    where: saleWhere,
    _sum: { totalQuantity: true, totalAmount: true },
    _count: { _all: true },
  });
  const byDay = new Map(grouped.map((g) => [g.eventDay, g]));

  const days = Array.from({ length: 10 }, (_, i) => {
    const day = i + 1;
    const row = byDay.get(day);
    return {
      dayNumber: day,
      label: `Day ${day}`,
      ticketsSold: row?._sum.totalQuantity ?? 0,
      targetTickets: event.dailyTarget,
      salesValue: money(row?._sum.totalAmount),
      saleCount: row?._count._all ?? 0,
    };
  });

  return { dailyTarget: event.dailyTarget, days };
}

export async function getAdminTicketMix(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(actor, filters, event.id);
  return ticketMix(saleWhere);
}

export async function getAdminTopSellers(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(actor, filters, event.id);
  const limit = Math.min(filters.limit || 10, 50);

  const grouped = await prisma.sale.groupBy({
    by: ['sellerId'],
    where: saleWhere,
    _sum: {
      totalQuantity: true,
      totalAmount: true,
      sellerProfit: true,
      baseAmount: true,
    },
    _count: { _all: true },
  });

  grouped.sort((a, b) => {
    const tq = (b._sum.totalQuantity ?? 0) - (a._sum.totalQuantity ?? 0);
    if (tq !== 0) return tq;
    const sv = Number(b._sum.totalAmount ?? 0) - Number(a._sum.totalAmount ?? 0);
    if (sv !== 0) return sv;
    return b._count._all - a._count._all;
  });

  const top = grouped.slice(0, limit);
  const totalTickets = grouped.reduce((s, g) => s + (g._sum.totalQuantity ?? 0), 0);

  const sellers = await prisma.sellerProfile.findMany({
    where: { id: { in: top.map((t) => t.sellerId) } },
    include: {
      user: { select: { name: true } },
      parentSeller: { include: { user: { select: { name: true } } } },
    },
  });
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));

  const collectedBySeller = await Promise.all(
    top.map(async (row) => {
      const amount = await sumCustomerCollected({ ...saleWhere, sellerId: row.sellerId });
      return [row.sellerId, amount] as const;
    }),
  );
  const collectedMap = new Map(collectedBySeller);

  const items = top.map((row, index) => {
    const s = sellerMap.get(row.sellerId);
    const tickets = row._sum.totalQuantity ?? 0;
    const salesValue = money(row._sum.totalAmount);
    const collected = collectedMap.get(row.sellerId) ?? 0;
    return {
      rank: index + 1,
      sellerId: row.sellerId,
      name: s?.user.name ?? 'Unknown',
      sellerCode: s?.sellerCode ?? '—',
      masterSeller: s?.parentSeller
        ? {
            id: s.parentSeller.id,
            name: s.parentSeller.user.name,
            sellerCode: s.parentSeller.sellerCode,
          }
        : null,
      ticketsSold: tickets,
      salesValue,
      sellerMargin: money(row._sum.sellerProfit),
      baseAmount: money(row._sum.baseAmount),
      collection: collected,
      outstanding: Math.max(0, Number((salesValue - collected).toFixed(2))),
      saleCount: row._count._all,
      salesContributionPercent:
        totalTickets > 0 ? Number(((tickets / totalTickets) * 100).toFixed(1)) : 0,
    };
  });

  return {
    scopeLabel:
      filters.eventDay != null ? `TOP SELLERS — DAY ${filters.eventDay}` : 'TOP SELLERS — ALL DAYS',
    ranking: {
      primary: 'totalTicketsSold',
      secondary: 'salesValue',
      tieBreaker: 'saleCount',
    },
    items,
  };
}

export async function getAdminTopMasters(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(actor, { ...filters, masterSellerId: undefined }, event.id);

  const masters = await prisma.sellerProfile.findMany({
    where: { user: { role: 'MASTER_SELLER' } },
    include: {
      user: { select: { name: true } },
      _count: { select: { childSellers: true } },
    },
  });

  const rows = [];
  for (const master of masters) {
    const teamIds = await getTeamSellerIdsIncludingSelf(prisma, master.id);
    const teamWhere: Prisma.SaleWhereInput = {
      ...saleWhere,
      sellerId: { in: teamIds },
    };
    const [agg, activeInTeam, collected] = await Promise.all([
      prisma.sale.aggregate({
        where: teamWhere,
        _sum: {
          totalQuantity: true,
          totalAmount: true,
          sellerProfit: true,
          baseAmount: true,
        },
      }),
      prisma.sellerProfile.count({
        where: { id: { in: teamIds }, activationStatus: 'ACTIVE' },
      }),
      sumCustomerCollected(teamWhere),
    ]);
    const tickets = agg._sum.totalQuantity ?? 0;
    const sales = money(agg._sum.totalAmount);
    rows.push({
      masterSellerId: master.id,
      name: master.user.name,
      sellerCode: master.sellerCode,
      teamSize: teamIds.length,
      activeSellers: activeInTeam,
      teamTickets: tickets,
      teamSales: sales,
      teamMargin: money(agg._sum.sellerProfit),
      teamCollection: collected,
      teamOutstanding: Math.max(0, Number((sales - collected).toFixed(2))),
      avgTicketsPerActiveSeller:
        activeInTeam > 0 ? Number((tickets / activeInTeam).toFixed(1)) : 0,
    });
  }

  rows.sort((a, b) => {
    if (b.teamTickets !== a.teamTickets) return b.teamTickets - a.teamTickets;
    return b.teamSales - a.teamSales;
  });

  return {
    items: rows.slice(0, Math.min(filters.limit || 10, 50)).map((r, i) => ({
      rank: i + 1,
      ...r,
    })),
  };
}

export async function getAdminPaymentSummary(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(
    actor,
    { ...filters, paymentStatus: undefined },
    event.id,
  );

  const grouped = await prisma.sale.groupBy({
    by: ['paymentStatus'],
    where: saleWhere,
    _count: { _all: true },
    _sum: { totalAmount: true, totalQuantity: true },
  });

  const slices = ['PENDING', 'PARTIAL', 'PAID', 'CANCELLED', 'OVERPAID', 'REFUNDED'].map(
    (status) => {
      const row = grouped.find((g) => g.paymentStatus === status);
      return {
        status,
        saleCount: row?._count._all ?? 0,
        tickets: row?._sum.totalQuantity ?? 0,
        amount: money(row?._sum.totalAmount),
      };
    },
  );

  return {
    definition:
      'Slices are counts of CONFIRMED sales by customer paymentStatus (not payment rows). CANCELLED sales are excluded from saleStatus filter.',
    slices: slices.filter((s) => s.status !== 'CANCELLED'),
  };
}

export async function getAdminSettlementSummary(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(
    actor,
    { ...filters, settlementStatus: undefined },
    event.id,
  );

  const grouped = await prisma.sale.groupBy({
    by: ['settlementStatus'],
    where: saleWhere,
    _count: { _all: true },
    _sum: { baseAmount: true, totalQuantity: true },
  });

  const mapStatus = (s: string) => {
    if (s === 'PENDING') return 'UNSETTLED';
    if (s === 'PARTIAL') return 'PARTIALLY_SETTLED';
    if (s === 'PAID') return 'SETTLED';
    return s;
  };

  return {
    definition:
      'Based on sale.settlementStatus for CONFIRMED sales (seller→admin base settlement track).',
    slices: grouped.map((g) => ({
      status: mapStatus(g.settlementStatus),
      rawStatus: g.settlementStatus,
      saleCount: g._count._all,
      tickets: g._sum.totalQuantity ?? 0,
      baseAmount: money(g._sum.baseAmount),
    })),
  };
}

export async function getAdminRecentSales(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(actor, filters, event.id);
  const limit = Math.min(filters.limit || 15, 50);

  const sales = await prisma.sale.findMany({
    where: saleWhere,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      customer: { select: { name: true, mobile: true } },
      seller: { include: { user: { select: { name: true } } } },
      items: { include: { ticketType: { select: { code: true } } } },
      customerPayments: {
        where: { status: 'RECORDED' },
        select: { amount: true },
      },
    },
  });

  return {
    items: sales.map((s) => {
      const paid = s.customerPayments.reduce((a, p) => a + Number(p.amount), 0);
      const gold = s.items.filter((i) => i.ticketType.code === 'GOLD').length;
      const vip = s.items.filter((i) => i.ticketType.code === 'VIP').length;
      return {
        id: s.id,
        saleNumber: s.saleNumber,
        customerName: s.customer.name,
        customerMobile: s.customer.mobile,
        sellerName: s.seller.user.name,
        sellerCode: s.seller.sellerCode,
        tickets: s.totalQuantity,
        gold,
        vip,
        amount: money(s.totalAmount),
        paid: Number(paid.toFixed(2)),
        outstanding: Math.max(0, Number((Number(s.totalAmount) - paid).toFixed(2))),
        paymentStatus: s.paymentStatus,
        eventDay: s.eventDay,
        createdAt: s.createdAt.toISOString(),
      };
    }),
  };
}

export async function getAdminRecentPayments(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const limit = Math.min(filters.limit || 15, 50);

  const saleFilter: Prisma.SaleWhereInput = { eventId: event.id, saleStatus: 'CONFIRMED' };
  if (filters.eventDay != null) saleFilter.eventDay = filters.eventDay;

  const [customerPays, sellerPays] = await Promise.all([
    prisma.customerPayment.findMany({
      where: { sale: saleFilter },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        customer: { select: { name: true } },
        sale: { select: { saleNumber: true, eventDay: true } },
      },
    }),
    filters.eventDay == null
      ? prisma.sellerPayment.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: { seller: { include: { user: { select: { name: true } } } } },
        })
      : Promise.resolve([]),
  ]);

  const items = [
    ...customerPays.map((p) => ({
      id: p.id,
      type: 'CUSTOMER_PAYMENT' as const,
      date: p.createdAt.toISOString(),
      person: p.customer.name,
      saleNumber: p.sale.saleNumber,
      eventDay: p.sale.eventDay,
      amount: money(p.amount),
      method: p.paymentMethod,
      status: p.status,
      reference: p.paymentReference,
    })),
    ...sellerPays.map((p) => ({
      id: p.id,
      type: 'SELLER_SETTLEMENT' as const,
      date: p.createdAt.toISOString(),
      person: p.seller.user.name,
      saleNumber: null as string | null,
      eventDay: null as number | null,
      amount: money(p.amount),
      method: p.paymentMethod,
      status: p.status,
      reference: p.transactionReference,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);

  return { items };
}

export async function getAdminEventPulse(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const day = filters.eventDay ?? suggestNavratriDay();
  const dayWhere: Prisma.SaleWhereInput = {
    eventId: event.id,
    saleStatus: 'CONFIRMED',
    ...(day != null
      ? { eventDay: day }
      : { soldAt: { gte: startOfTodayIst(), lt: endOfTodayIst() } }),
  };

  const [agg, mix, top, lastSale, lastPay, sellersToday, customersToday] = await Promise.all([
    prisma.sale.aggregate({
      where: dayWhere,
      _sum: { totalQuantity: true, totalAmount: true },
      _count: { _all: true },
    }),
    ticketMix(dayWhere),
    getAdminTopSellers(actor, { ...query, eventDay: day ?? undefined, limit: 1 }),
    prisma.sale.findFirst({
      where: dayWhere,
      orderBy: { createdAt: 'desc' },
      select: { saleNumber: true, createdAt: true, totalQuantity: true },
    }),
    prisma.customerPayment.findFirst({
      where: { status: 'RECORDED', sale: dayWhere },
      orderBy: { createdAt: 'desc' },
      select: { amount: true, createdAt: true, paymentMethod: true },
    }),
    prisma.sale.findMany({
      where: dayWhere,
      distinct: ['sellerId'],
      select: { sellerId: true },
    }),
    prisma.sale.findMany({
      where: dayWhere,
      distinct: ['customerId'],
      select: { customerId: true },
    }),
  ]);

  const collected = await sumCustomerCollected(dayWhere);

  return {
    refreshedAt: new Date().toISOString(),
    eventDay: day,
    ticketsSoldToday: agg._sum.totalQuantity ?? 0,
    salesToday: money(agg._sum.totalAmount),
    collectionToday: collected,
    activeSellersToday: sellersToday.length,
    customersToday: customersToday.length,
    goldToday: mix.gold,
    vipToday: mix.vip,
    topSellerToday: top.items[0] ?? null,
    lastSale,
    lastPayment: lastPay
      ? {
          amount: money(lastPay.amount),
          method: lastPay.paymentMethod,
          at: lastPay.createdAt.toISOString(),
        }
      : null,
  };
}

export async function getAdminSellerPerformance(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(actor, filters, event.id);
  const page = filters.page;
  const limit = filters.limit;

  const grouped = await prisma.sale.groupBy({
    by: ['sellerId'],
    where: saleWhere,
    _sum: {
      totalQuantity: true,
      totalAmount: true,
      sellerProfit: true,
      baseAmount: true,
    },
    _count: { _all: true },
    _max: { soldAt: true },
  });

  grouped.sort((a, b) => {
    const tq = (b._sum.totalQuantity ?? 0) - (a._sum.totalQuantity ?? 0);
    if (tq !== 0) return tq;
    return Number(b._sum.totalAmount ?? 0) - Number(a._sum.totalAmount ?? 0);
  });

  const totalTickets = grouped.reduce((s, g) => s + (g._sum.totalQuantity ?? 0), 0);
  const total = grouped.length;
  const pageRows = grouped.slice((page - 1) * limit, page * limit);

  const sellers = await prisma.sellerProfile.findMany({
    where: { id: { in: pageRows.map((r) => r.sellerId) } },
    include: {
      user: { select: { name: true, status: true } },
      parentSeller: { include: { user: { select: { name: true } } } },
    },
  });
  const map = new Map(sellers.map((s) => [s.id, s]));

  const items = await Promise.all(
    pageRows.map(async (row, idx) => {
      const s = map.get(row.sellerId);
      const tickets = row._sum.totalQuantity ?? 0;
      const sales = money(row._sum.totalAmount);
      const collected = await sumCustomerCollected({ ...saleWhere, sellerId: row.sellerId });
      return {
        rank: (page - 1) * limit + idx + 1,
        sellerId: row.sellerId,
        name: s?.user.name ?? 'Unknown',
        sellerCode: s?.sellerCode ?? '—',
        status: s?.activationStatus ?? '—',
        master: s?.parentSeller
          ? { name: s.parentSeller.user.name, sellerCode: s.parentSeller.sellerCode }
          : null,
        totalTickets: tickets,
        sales,
        margin: money(row._sum.sellerProfit),
        customerCollection: collected,
        customerOutstanding: Math.max(0, Number((sales - collected).toFixed(2))),
        baseAmount: money(row._sum.baseAmount),
        lastSaleAt: row._max.soldAt?.toISOString() ?? null,
        salesContributionPercent:
          totalTickets > 0 ? Number(((tickets / totalTickets) * 100).toFixed(1)) : 0,
      };
    }),
  );

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    contributionLabel: 'Sales Contribution',
    contributionFormula: 'sellerTickets / totalEventTickets (filtered scope)',
    items,
  };
}

export async function getAdminOutstandingAlerts(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const filters = parseDashboardFilters(query);
  const event = await resolveActiveEvent(filters.eventId);
  const saleWhere = await buildSaleWhere(actor, filters, event.id);

  const sales = await prisma.sale.findMany({
    where: {
      ...saleWhere,
      paymentStatus: { in: ['PENDING', 'PARTIAL'] },
    },
    orderBy: { totalAmount: 'desc' },
    take: 10,
    include: {
      customer: { select: { name: true } },
      seller: { include: { user: { select: { name: true } } } },
      customerPayments: { where: { status: 'RECORDED' }, select: { amount: true } },
    },
  });

  const customerOutstanding = sales
    .map((s) => {
      const paid = s.customerPayments.reduce((a, p) => a + Number(p.amount), 0);
      const outstanding = Math.max(0, Number(s.totalAmount) - paid);
      return {
        saleId: s.id,
        saleNumber: s.saleNumber,
        customerName: s.customer.name,
        sellerName: s.seller.user.name,
        outstanding: Number(outstanding.toFixed(2)),
        paymentStatus: s.paymentStatus,
        eventDay: s.eventDay,
      };
    })
    .filter((r) => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 8);

  // Seller outstanding from ledger (global — not day scoped)
  const sellers = await prisma.sellerProfile.findMany({
    where: { activationStatus: 'ACTIVE' },
    take: 200,
    include: { user: { select: { name: true } } },
  });
  const sellerOutstanding = [];
  for (const s of sellers) {
    const entries = await prisma.sellerLedgerEntry.groupBy({
      by: ['direction'],
      where: { sellerId: s.id },
      _sum: { amount: true },
    });
    const debit = Number(entries.find((e) => e.direction === 'DEBIT')?._sum.amount ?? 0);
    const credit = Number(entries.find((e) => e.direction === 'CREDIT')?._sum.amount ?? 0);
    const outstanding = Math.max(0, debit - credit);
    if (outstanding > 0) {
      sellerOutstanding.push({
        sellerId: s.id,
        name: s.user.name,
        sellerCode: s.sellerCode,
        outstanding: Number(outstanding.toFixed(2)),
      });
    }
  }
  sellerOutstanding.sort((a, b) => b.outstanding - a.outstanding);

  return {
    label: 'Needs Attention',
    note: 'No due-date field exists; items listed by outstanding amount.',
    customerOutstanding: customerOutstanding.slice(0, 8),
    sellerOutstanding: sellerOutstanding.slice(0, 8),
  };
}

export async function getAdminEventHealth(actor: AuthUser, query: Record<string, unknown>) {
  requireAdmin(actor);
  const summary = await getAdminSummary(actor, query);
  const target = await getAdminTargetProgress(actor, query);
  const pulse = await getAdminEventPulse(actor, query);

  const dailyPct = summary.kpis.todayAchievementPercent;
  const eventPct = target.achievementPercent;
  const collectionRatio =
    summary.kpis.totalSalesValue > 0
      ? summary.kpis.customerCollection / summary.kpis.totalSalesValue
      : 1;

  let status: 'ON_TRACK' | 'WATCH' | 'ATTENTION' = 'ON_TRACK';
  const reasons: string[] = [];

  if (dailyPct < 50 || eventPct < 35) {
    status = 'ATTENTION';
    reasons.push('Ticket pace below healthy band');
  } else if (dailyPct < 80 || eventPct < 55) {
    status = 'WATCH';
    reasons.push('Ticket pace needs monitoring');
  }

  if (collectionRatio < 0.55) {
    status = status === 'ON_TRACK' ? 'WATCH' : status;
    if (collectionRatio < 0.4) status = 'ATTENTION';
    reasons.push('Customer collection ratio low');
  }

  if (pulse.activeSellersToday < 5 && suggestNavratriDay() != null) {
    status = status === 'ON_TRACK' ? 'WATCH' : status;
    reasons.push('Few active sellers today');
  }

  if (reasons.length === 0) reasons.push('Pace and collection within healthy bands');

  return {
    status,
    reasons,
    calculation: {
      dailyAchievementPercent: dailyPct,
      eventAchievementPercent: eventPct,
      collectionRatio: Number(collectionRatio.toFixed(3)),
      activeSellersToday: pulse.activeSellersToday,
    },
  };
}

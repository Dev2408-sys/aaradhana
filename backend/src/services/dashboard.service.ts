import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import { ForbiddenError } from '../utils/errors';

function isAdmin(user: AuthUser) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

function money(d: Prisma.Decimal) {
  return Number(d.toFixed(2));
}

export async function getSalesSummary(actor: AuthUser) {
  const where: Prisma.SaleWhereInput = {
    saleStatus: 'CONFIRMED',
  };

  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId) throw new ForbiddenError();
    where.sellerId = actor.sellerProfileId;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const todayWhere: Prisma.SaleWhereInput = {
    ...where,
    soldAt: { gte: start, lt: end },
  };

  const [agg, goldTickets, vipTickets, event] = await Promise.all([
    prisma.sale.aggregate({
      where: todayWhere,
      _sum: {
        totalQuantity: true,
        totalAmount: true,
        baseAmount: true,
        sellerProfit: true,
      },
      _count: { _all: true },
    }),
    prisma.ticket.count({
      where: {
        soldAt: { gte: start, lt: end },
        status: 'SOLD',
        ticketType: { code: 'GOLD' },
        ...(where.sellerId ? { sellerId: where.sellerId as string } : {}),
      },
    }),
    prisma.ticket.count({
      where: {
        soldAt: { gte: start, lt: end },
        status: 'SOLD',
        ticketType: { code: 'VIP' },
        ...(where.sellerId ? { sellerId: where.sellerId as string } : {}),
      },
    }),
    prisma.event.findFirst({
      where: { status: 'ACTIVE' },
      select: { dailyTarget: true, name: true },
    }),
  ]);

  const ticketsSold = agg._sum.totalQuantity ?? 0;
  const target = event?.dailyTarget ?? 1100;
  const remaining = Math.max(0, target - ticketsSold);
  const achievement =
    target > 0 ? Number(((ticketsSold / target) * 100).toFixed(2)) : 0;

  return {
    period: 'today',
    eventName: event?.name ?? null,
    target,
    ticketsSold,
    remaining,
    achievementPercent: achievement,
    goldSold: goldTickets,
    vipSold: vipTickets,
    saleCount: agg._count._all,
    customerSales: money(agg._sum.totalAmount ?? new Prisma.Decimal(0)),
    baseAmount: money(agg._sum.baseAmount ?? new Prisma.Decimal(0)),
    sellerMargin: money(agg._sum.sellerProfit ?? new Prisma.Decimal(0)),
  };
}

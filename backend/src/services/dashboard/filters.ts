import { Prisma } from '@prisma/client';
import type { AuthUser } from '../../types/auth-user';
import { ForbiddenError, ValidationAppError } from '../../utils/errors';
import { isValidNavratriDay } from '../../utils/navratri-days';
import { prisma } from '../../config/prisma';
import { getTeamSellerIdsIncludingSelf } from '../hierarchy.service';

export type DashboardFilters = {
  eventId?: string;
  eventDay?: number | null;
  eventDayId?: string;
  startDate?: Date;
  endDate?: Date;
  sellerId?: string;
  masterSellerId?: string;
  ticketTypeId?: string;
  paymentStatus?: string;
  settlementStatus?: string;
  search?: string;
  page: number;
  limit: number;
};

export function isAdmin(user: AuthUser) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

function parseOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new ValidationAppError('Invalid numeric filter');
  return Math.trunc(n);
}

function parseDate(value: unknown, label: string): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) throw new ValidationAppError(`Invalid ${label}`);
  return d;
}

export function parseDashboardFilters(query: Record<string, unknown>): DashboardFilters {
  const eventDayRaw = parseOptionalInt(query.eventDay);
  if (eventDayRaw != null && !isValidNavratriDay(eventDayRaw)) {
    throw new ValidationAppError('eventDay must be between 1 and 10');
  }

  const page = Math.max(1, parseOptionalInt(query.page) ?? 1);
  const limit = Math.min(100, Math.max(1, parseOptionalInt(query.limit) ?? 20));

  return {
    eventId: query.eventId ? String(query.eventId) : undefined,
    eventDay: eventDayRaw ?? null,
    eventDayId: query.eventDayId ? String(query.eventDayId) : undefined,
    startDate: parseDate(query.startDate, 'startDate'),
    endDate: parseDate(query.endDate, 'endDate'),
    sellerId: query.sellerId ? String(query.sellerId) : undefined,
    masterSellerId: query.masterSellerId ? String(query.masterSellerId) : undefined,
    ticketTypeId: query.ticketTypeId ? String(query.ticketTypeId) : undefined,
    paymentStatus: query.paymentStatus ? String(query.paymentStatus) : undefined,
    settlementStatus: query.settlementStatus ? String(query.settlementStatus) : undefined,
    search: query.search ? String(query.search).trim() : undefined,
    page,
    limit,
  };
}

export async function resolveActiveEvent(eventId?: string) {
  const event = eventId
    ? await prisma.event.findUnique({ where: { id: eventId } })
    : await prisma.event.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'asc' },
      });
  if (!event) throw new ValidationAppError('Active event not found');
  return event;
}

/**
 * Build CONFIRMED sale where clause with auth scoping.
 * Seller: forced to own sellerId.
 * Master: own team; optional sellerId must be in team.
 */
export async function buildSaleWhere(
  actor: AuthUser,
  filters: DashboardFilters,
  eventId: string,
): Promise<Prisma.SaleWhereInput> {
  const where: Prisma.SaleWhereInput = {
    eventId,
    saleStatus: 'CONFIRMED',
  };

  if (filters.eventDay != null) where.eventDay = filters.eventDay;
  if (filters.eventDayId) where.eventDayId = filters.eventDayId;

  if (filters.startDate || filters.endDate) {
    where.soldAt = {};
    if (filters.startDate) where.soldAt.gte = filters.startDate;
    if (filters.endDate) where.soldAt.lte = filters.endDate;
  }

  if (filters.paymentStatus) {
    where.paymentStatus = filters.paymentStatus as Prisma.EnumPaymentStatusFilter['equals'];
  }
  if (filters.settlementStatus) {
    where.settlementStatus =
      filters.settlementStatus as Prisma.EnumSellerSettlementStatusFilter['equals'];
  }

  if (filters.ticketTypeId) {
    where.items = { some: { ticketTypeId: filters.ticketTypeId } };
  }

  if (filters.search) {
    where.OR = [
      { saleNumber: { contains: filters.search, mode: 'insensitive' } },
      { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
      { customer: { mobile: { contains: filters.search } } },
      { seller: { sellerCode: { contains: filters.search, mode: 'insensitive' } } },
      { seller: { user: { name: { contains: filters.search, mode: 'insensitive' } } } },
    ];
  }

  if (isAdmin(actor)) {
    if (filters.masterSellerId) {
      const teamIds = await getTeamSellerIdsIncludingSelf(prisma, filters.masterSellerId);
      if (filters.sellerId) {
        if (!teamIds.includes(filters.sellerId)) {
          where.sellerId = '__none__';
        } else {
          where.sellerId = filters.sellerId;
        }
      } else {
        where.sellerId = { in: teamIds };
      }
    } else if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }
    return where;
  }

  if (!actor.sellerProfileId) throw new ForbiddenError();

  if (actor.role === 'SELLER') {
    where.sellerId = actor.sellerProfileId;
    return where;
  }

  const teamIds = await getTeamSellerIdsIncludingSelf(prisma, actor.sellerProfileId);
  if (filters.sellerId) {
    if (!teamIds.includes(filters.sellerId)) {
      throw new ForbiddenError('Seller is outside your team');
    }
    where.sellerId = filters.sellerId;
  } else if (filters.masterSellerId && filters.masterSellerId !== actor.sellerProfileId) {
    throw new ForbiddenError('Cannot view another master team');
  } else {
    where.sellerId = { in: teamIds };
  }

  return where;
}

export function money(n: Prisma.Decimal | number | null | undefined) {
  if (n == null) return 0;
  if (typeof n === 'number') return Number(n.toFixed(2));
  return Number(n.toFixed(2));
}

export function eventLifecycleStatus(startDate: Date, endDate: Date, now = new Date()) {
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const start = new Date(startDate);
  const end = new Date(endDate);
  // Compare IST calendar dates roughly via timestamps of event bounds
  if (ist < start) return 'UPCOMING' as const;
  if (ist > end) return 'COMPLETED' as const;
  return 'LIVE' as const;
}

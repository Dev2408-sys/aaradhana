import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import { ForbiddenError, NotFoundError } from '../utils/errors';

function isAdmin(user: AuthUser) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

function money(d: Prisma.Decimal | null | undefined) {
  if (!d) return null;
  return Number(d.toFixed(2));
}

export async function listTickets(
  actor: AuthUser,
  query: {
    page?: number;
    pageSize?: number;
    search?: string;
    ticketTypeCode?: string;
    sellerId?: string;
    status?: string;
    eventDay?: number;
    from?: string;
    to?: string;
  },
) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.TicketWhereInput = {};

  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId) throw new ForbiddenError();
    where.sellerId = actor.sellerProfileId;
  } else if (query.sellerId) {
    where.sellerId = query.sellerId;
  }

  if (query.status) where.status = query.status as never;
  if (query.ticketTypeCode) {
    where.ticketType = { code: query.ticketTypeCode };
  }
  if (query.from || query.to) {
    where.soldAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lt: new Date(query.to) } : {}),
    };
  }

  const andFilters: Prisma.TicketWhereInput[] = [];
  if (query.eventDay != null) {
    andFilters.push({ sale: { eventDay: query.eventDay } });
  }

  if (query.search?.trim()) {
    const q = query.search.trim();
    andFilters.push({
      OR: [
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { customer: { mobile: { contains: q } } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { sale: { saleNumber: { contains: q, mode: 'insensitive' } } },
        { seller: { sellerCode: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }

  if (andFilters.length) {
    where.AND = andFilters;
  }

  const [total, rows] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      include: {
        ticketType: { select: { id: true, code: true, name: true } },
        seller: {
          select: {
            id: true,
            sellerCode: true,
            user: { select: { name: true } },
          },
        },
        customer: { select: { id: true, name: true, mobile: true } },
        sale: { select: { id: true, saleNumber: true } },
        saleItem: {
          select: {
            sellingPrice: true,
            basePrice: true,
            sellerProfit: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      zone: t.zone ?? t.ticketType.code,
      status: t.status,
      ticketType: t.ticketType,
      seller: t.seller
        ? {
            id: t.seller.id,
            sellerCode: t.seller.sellerCode,
            name: t.seller.user.name,
          }
        : null,
      customer: t.customer,
      sale: t.sale,
      sellingPrice: money(t.saleItem?.sellingPrice),
      basePrice: money(t.saleItem?.basePrice),
      sellerMargin: money(t.saleItem?.sellerProfit),
      issuedAt: t.issuedAt,
      soldAt: t.soldAt,
      createdAt: t.createdAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getTicketById(actor: AuthUser, id: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      ticketType: true,
      seller: {
        select: {
          id: true,
          sellerCode: true,
          user: { select: { name: true, mobile: true } },
        },
      },
      customer: true,
      sale: true,
      saleItem: true,
    },
  });

  if (!ticket) throw new NotFoundError('Ticket not found');

  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId || ticket.sellerId !== actor.sellerProfileId) {
      throw new ForbiddenError('You cannot access this ticket');
    }
  }

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    zone: ticket.zone ?? ticket.ticketType.code,
    status: ticket.status,
    ticketType: {
      id: ticket.ticketType.id,
      code: ticket.ticketType.code,
      name: ticket.ticketType.name,
    },
    seller: ticket.seller
      ? {
          id: ticket.seller.id,
          sellerCode: ticket.seller.sellerCode,
          name: ticket.seller.user.name,
          mobile: ticket.seller.user.mobile,
        }
      : null,
    customer: ticket.customer,
    sale: ticket.sale
      ? { id: ticket.sale.id, saleNumber: ticket.sale.saleNumber }
      : null,
    sellingPrice: money(ticket.saleItem?.sellingPrice),
    basePrice: money(ticket.saleItem?.basePrice),
    sellerMargin: money(ticket.saleItem?.sellerProfit),
    issuedAt: ticket.issuedAt,
    soldAt: ticket.soldAt,
    createdAt: ticket.createdAt,
  };
}

export async function getTicketStats(actor: AuthUser) {
  const where: Prisma.TicketWhereInput = {};
  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId) throw new ForbiddenError();
    where.sellerId = actor.sellerProfileId;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [total, gold, vip, today] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { ...where, ticketType: { code: 'GOLD' } } }),
    prisma.ticket.count({ where: { ...where, ticketType: { code: 'VIP' } } }),
    prisma.ticket.count({
      where: { ...where, soldAt: { gte: start, lt: end } },
    }),
  ]);

  return {
    totalIssued: total,
    goldIssued: gold,
    vipIssued: vip,
    todayIssued: today,
  };
}

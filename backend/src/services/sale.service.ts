import { Prisma, TicketStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import {
  ForbiddenError,
  NotFoundError,
  ValidationAppError,
} from '../utils/errors';
import { createAuditLog } from './audit.service';
import { findOrCreateCustomerInTx } from './customer.service';
import { recordFullCustomerPaymentInTx } from './customer-payment.service';
import { postSaleDebit, recomputeSaleSettlementStatuses } from './ledger.service';
import { createNotifications } from './notification.service';
import { reserveSaleNumber } from './sale-number.service';
import { reserveTicketNumbers } from './ticket-number.service';
import {
  eventDateForDay,
  isValidNavratriDay,
  suggestNavratriDay,
} from '../utils/navratri-days';
import { resolveEventDay } from './event-day.service';
import { resolvePriceForDay } from './pricing.service';

function isAdmin(user: AuthUser) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

function toMoney(value: number | string | Prisma.Decimal) {
  return new Prisma.Decimal(value);
}

function moneyNumber(d: Prisma.Decimal) {
  return Number(d.toFixed(2));
}

export type CreateSaleInput = {
  sellerId?: string;
  /** Navratri Day 1–10 (11–20 Oct 2026) */
  eventDay?: number;
  customer: {
    name: string;
    mobile: string;
    email?: string | null;
    city?: string | null;
  };
  items: Array<{
    ticketTypeId: string;
    quantity: number;
    sellingPrice: number;
  }>;
  customerPaymentStatus?: 'PENDING' | 'PAID';
  /** @deprecated — use adminPaymentProofUrl */
  adminPaymentUtr?: string | null;
  /** Payment screenshot URL (required when seller submits) */
  adminPaymentProofUrl?: string | null;
  /** Optional tag e.g. DEMO for seed datasets */
  dataSource?: string | null;
};

const saleInclude = {
  seller: {
    select: {
      id: true,
      sellerCode: true,
      user: { select: { id: true, name: true, mobile: true } },
    },
  },
  customer: true,
  event: { select: { id: true, name: true } },
  items: {
    include: {
      ticket: {
        select: {
          id: true,
          ticketNumber: true,
          status: true,
          zone: true,
          ticketType: { select: { id: true, code: true, name: true } },
        },
      },
      ticketType: { select: { id: true, code: true, name: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  tickets: {
    select: {
      id: true,
      ticketNumber: true,
      status: true,
      zone: true,
      ticketTypeId: true,
      soldAt: true,
    },
    orderBy: { ticketNumber: 'asc' as const },
  },
} satisfies Prisma.SaleInclude;

function mapSale(sale: Prisma.SaleGetPayload<{ include: typeof saleInclude }>) {
  const goldCount = sale.tickets.filter(
    (t) => sale.items.find((i) => i.ticketId === t.id)?.ticketType.code === 'GOLD',
  ).length;
  const vipCount = sale.tickets.filter(
    (t) => sale.items.find((i) => i.ticketId === t.id)?.ticketType.code === 'VIP',
  ).length;

  // Prefer counting from ticket types on items
  const goldFromItems = sale.items.filter((i) => i.ticketType.code === 'GOLD').length;
  const vipFromItems = sale.items.filter((i) => i.ticketType.code === 'VIP').length;

  return {
    id: sale.id,
    saleNumber: sale.saleNumber,
    sellerId: sale.sellerId,
    seller: {
      id: sale.seller.id,
      sellerCode: sale.seller.sellerCode,
      name: sale.seller.user.name,
      mobile: sale.seller.user.mobile,
    },
    customer: {
      id: sale.customer.id,
      name: sale.customer.name,
      mobile: sale.customer.mobile,
      email: sale.customer.email,
      city: sale.customer.city,
    },
    event: sale.event,
    eventDay: sale.eventDay,
    eventDayId: sale.eventDayId,
    dataSource: sale.dataSource,
    totalQuantity: sale.totalQuantity,
    goldCount: goldFromItems || goldCount,
    vipCount: vipFromItems || vipCount,
    totalAmount: moneyNumber(sale.totalAmount),
    baseAmount: moneyNumber(sale.baseAmount),
    sellerProfit: moneyNumber(sale.sellerProfit),
    customerPaymentStatus: sale.paymentStatus,
    settlementStatus: sale.settlementStatus,
    saleStatus: sale.saleStatus,
    deliveryStatus: sale.deliveryStatus,
    adminPaymentUtr: sale.adminPaymentUtr,
    adminPaymentProofUrl: sale.adminPaymentProofUrl,
    approvedAt: sale.approvedAt,
    ticketsTransferredAt: sale.ticketsTransferredAt,
    whatsappSentAt: sale.whatsappSentAt,
    rejectedReason: sale.rejectedReason,
    soldAt: sale.soldAt,
    createdAt: sale.createdAt,
    items: sale.items.map((item) => ({
      id: item.id,
      ticketId: item.ticketId,
      ticketNumber: item.ticket.ticketNumber,
      ticketTypeId: item.ticketTypeId,
      ticketTypeCode: item.ticketType.code,
      zone: item.ticket.zone ?? item.ticketType.code,
      sellingPrice: moneyNumber(item.sellingPrice),
      basePrice: moneyNumber(item.basePrice),
      sellerMargin: moneyNumber(item.sellerProfit),
      status: item.ticket.status,
    })),
    tickets: sale.tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      status: t.status,
      zone: t.zone,
      ticketTypeId: t.ticketTypeId,
      soldAt: t.soldAt,
    })),
  };
}

async function resolveSellerForSale(actor: AuthUser, requestedSellerId?: string) {
  if (isAdmin(actor)) {
    if (!requestedSellerId) {
      throw new ValidationAppError('sellerId is required for admin-created sales');
    }
    const seller = await prisma.sellerProfile.findUnique({
      where: { id: requestedSellerId },
      include: { user: { select: { id: true, name: true, status: true } } },
    });
    if (!seller) throw new NotFoundError('Seller not found');
    if (seller.activationStatus !== 'ACTIVE') {
      throw new ValidationAppError('Seller is not active');
    }
    return seller;
  }

  if (!actor.sellerProfileId) {
    throw new ForbiddenError('No seller profile linked to this account');
  }

  if (requestedSellerId && requestedSellerId !== actor.sellerProfileId) {
    throw new ForbiddenError('You cannot create a sale for another seller');
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { id: actor.sellerProfileId },
    include: { user: { select: { id: true, name: true, status: true } } },
  });

  if (!seller || seller.activationStatus !== 'ACTIVE') {
    throw new ForbiddenError('Seller account is not active');
  }

  return seller;
}

export async function createSale(
  actor: AuthUser,
  input: CreateSaleInput,
  ipAddress?: string,
) {
  if (!input.items?.length) {
    throw new ValidationAppError('At least one sale item is required');
  }

  if (!input.customer?.name?.trim()) {
    throw new ValidationAppError('Customer name is required');
  }

  const seller = await resolveSellerForSale(actor, input.sellerId);

  // Sellers submit for admin approval; admin-created sales confirm immediately.
  const autoConfirm = isAdmin(actor);

  const adminPaymentUtr = input.adminPaymentUtr?.trim() || null;
  const adminPaymentProofUrl = input.adminPaymentProofUrl?.trim() || null;
  if (!autoConfirm) {
    if (!adminPaymentProofUrl || !adminPaymentProofUrl.startsWith('/uploads/')) {
      throw new ValidationAppError(
        'Pay admin UPI and upload payment screenshot before submitting',
      );
    }
  }

  // Seller booking + payment screenshot = PAID (admin can approve only when PAID)
  const paymentStatus = !autoConfirm
    ? 'PAID'
    : input.customerPaymentStatus === 'PAID'
      ? 'PAID'
      : 'PENDING';

  const eventDay =
    input.eventDay != null
      ? input.eventDay
      : suggestNavratriDay() ?? undefined;

  if (eventDay != null && !isValidNavratriDay(eventDay)) {
    throw new ValidationAppError('eventDay must be between 1 and 10 (11–20 Oct)');
  }

  const totalQtyRequested = input.items.reduce((sum, i) => sum + i.quantity, 0);
  if (totalQtyRequested > 1000) {
    throw new ValidationAppError('A single sale cannot exceed 1000 tickets');
  }

  const saleId = await prisma.$transaction(
    async (tx) => {
      const event = await tx.event.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'asc' },
      });
      if (!event) {
        throw new NotFoundError('No active event found');
      }

      const ticketEventDate =
        eventDay != null ? eventDateForDay(eventDay) : null;

      const eventDayRow =
        eventDay != null
          ? await resolveEventDay(tx, event.id, eventDay)
          : null;

      // Validate items & load ticket types
      const prepared: Array<{
        ticketTypeId: string;
        code: string;
        zone: string;
        quantity: number;
        sellingPrice: Prisma.Decimal;
        basePrice: Prisma.Decimal;
        margin: Prisma.Decimal;
        numbers: string[];
      }> = [];

      let totalQuantity = 0;
      let totalSelling = toMoney(0);
      let totalBase = toMoney(0);
      let totalMargin = toMoney(0);

      for (const item of input.items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
          throw new ValidationAppError('Quantity must be a positive integer');
        }
        if (
          typeof item.sellingPrice !== 'number' ||
          !Number.isFinite(item.sellingPrice) ||
          item.sellingPrice <= 0
        ) {
          throw new ValidationAppError('Selling price must be a positive number');
        }

        const ticketType = await tx.ticketType.findFirst({
          where: {
            id: item.ticketTypeId,
            eventId: event.id,
            active: true,
          },
        });

        if (!ticketType) {
          throw new ValidationAppError('Invalid or inactive ticket type');
        }

        const sellingPrice = toMoney(item.sellingPrice);
        const dayPrice = await resolvePriceForDay(tx, {
          eventId: event.id,
          ticketTypeId: ticketType.id,
          eventDay: eventDay ?? null,
          fallbackBase: ticketType.basePrice,
          fallbackMinimum: ticketType.minimumPrice,
        });
        const basePrice = dayPrice.basePrice;
        const minSell = dayPrice.minimumSellingPrice;

        if (sellingPrice.lt(minSell)) {
          throw new ValidationAppError(
            `Customer selling price for ${ticketType.code} must be at least ₹${moneyNumber(minSell)} (Day ${eventDay ?? 'N/A'} rule)`,
          );
        }

        const margin = sellingPrice.minus(basePrice);
        if (margin.lt(0)) {
          throw new ValidationAppError(
            `Selling price cannot be below admin base ₹${moneyNumber(basePrice)} for ${ticketType.code}`,
          );
        }

        const numbers = await reserveTicketNumbers(tx, {
          eventId: event.id,
          ticketTypeId: ticketType.id,
          quantity: item.quantity,
        });

        prepared.push({
          ticketTypeId: ticketType.id,
          code: ticketType.code,
          zone: ticketType.code,
          quantity: item.quantity,
          sellingPrice,
          basePrice,
          margin,
          numbers,
        });

        totalQuantity += item.quantity;
        totalSelling = totalSelling.plus(sellingPrice.mul(item.quantity));
        totalBase = totalBase.plus(basePrice.mul(item.quantity));
        totalMargin = totalMargin.plus(margin.mul(item.quantity));
      }

      const { customer, created: customerCreated } = await findOrCreateCustomerInTx(
        tx,
        input.customer,
        actor.id,
      );

      const saleNumber = await reserveSaleNumber(tx);
      const now = new Date();

      const sale = await tx.sale.create({
        data: {
          saleNumber,
          sellerId: seller.id,
          customerId: customer.id,
          eventId: event.id,
          eventDay: eventDay ?? null,
          eventDayId: eventDayRow?.id ?? null,
          dataSource: input.dataSource ?? null,
          totalQuantity,
          totalAmount: totalSelling,
          baseAmount: totalBase,
          sellerProfit: totalMargin,
          paymentStatus,
          settlementStatus: 'PENDING',
          saleStatus: autoConfirm ? 'CONFIRMED' : 'PENDING',
          deliveryStatus: autoConfirm ? 'AWAITING_PAYMENT' : 'AWAITING_APPROVAL',
          adminPaymentUtr,
          adminPaymentProofUrl,
          approvedAt: autoConfirm ? now : null,
          approvedByUserId: autoConfirm ? actor.id : null,
          soldAt: now,
        },
      });

      const ticketRows: Prisma.TicketCreateManyInput[] = [];
      const saleItemRows: Prisma.SaleItemCreateManyInput[] = [];

      for (const prep of prepared) {
        for (const ticketNumber of prep.numbers) {
          const ticketId = randomUUID();
          ticketRows.push({
            id: ticketId,
            ticketNumber,
            ticketTypeId: prep.ticketTypeId,
            eventId: event.id,
            zone: prep.zone,
            eventDate: ticketEventDate,
            // Held until payment transfer; admin-confirmed paid sales become SOLD below
            status: TicketStatus.ISSUED,
            sellerId: seller.id,
            customerId: autoConfirm ? customer.id : null,
            saleId: sale.id,
            issuedAt: now,
            soldAt: null,
          });
          saleItemRows.push({
            id: randomUUID(),
            saleId: sale.id,
            ticketId,
            ticketTypeId: prep.ticketTypeId,
            sellingPrice: prep.sellingPrice,
            basePrice: prep.basePrice,
            sellerProfit: prep.margin,
          });
        }
      }

      await tx.ticket.createMany({ data: ticketRows });
      await tx.saleItem.createMany({ data: saleItemRows });

      if (autoConfirm) {
        await postSaleDebit(tx, {
          sellerId: seller.id,
          saleId: sale.id,
          saleNumber,
          baseAmount: totalBase,
          createdByUserId: actor.id,
        });
        await recomputeSaleSettlementStatuses(tx, seller.id);

        if (paymentStatus === 'PAID') {
          await recordFullCustomerPaymentInTx(tx, {
            saleId: sale.id,
            customerId: customer.id,
            amount: totalSelling,
            actorId: actor.id,
            saleNumber,
            sellerUserId: seller.userId,
          });
          await tx.ticket.updateMany({
            where: { saleId: sale.id },
            data: {
              status: TicketStatus.SOLD,
              customerId: customer.id,
              soldAt: now,
            },
          });
          await tx.sale.update({
            where: { id: sale.id },
            data: {
              deliveryStatus: 'READY_TO_SEND',
              ticketsTransferredAt: now,
              paymentStatus: 'PAID',
            },
          });
        }
      }

      await createAuditLog(
        {
          userId: actor.id,
          action: 'SALE_CREATED',
          entityType: 'sale',
          entityId: sale.id,
          newValue: {
            saleNumber,
            sellerId: seller.id,
            customerId: customer.id,
            totalQuantity,
            totalAmount: moneyNumber(totalSelling),
            baseAmount: moneyNumber(totalBase),
            sellerProfit: moneyNumber(totalMargin),
            saleStatus: autoConfirm ? 'CONFIRMED' : 'PENDING',
            adminPaymentProofUrl,
          },
          ipAddress,
        },
        tx,
      );

      await createAuditLog(
        {
          userId: actor.id,
          action: 'TICKET_CREATED',
          entityType: 'sale',
          entityId: sale.id,
          newValue: {
            count: ticketRows.length,
            ticketNumbers: ticketRows.map((t) => t.ticketNumber),
          },
          ipAddress,
        },
        tx,
      );

      if (!customerCreated) {
        // already audited on create; no-op
      }

      const adminUsers = await tx.user.findMany({
        where: {
          role: { in: ['SUPER_ADMIN', 'ADMIN'] },
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      await createNotifications(tx, [
        {
          recipientUserId: seller.userId,
          type: 'SALE_CREATED',
          title: autoConfirm ? 'Sale Confirmed' : 'Sale submitted',
          message: autoConfirm
            ? `Your sale ${saleNumber} was successfully created with ${totalQuantity} tickets.`
            : `Sale ${saleNumber} submitted with ${totalQuantity} tickets. Waiting for admin approval.`,
          entityType: 'sale',
          entityId: sale.id,
        },
        ...adminUsers.map((admin) => ({
          recipientUserId: admin.id,
          type: 'NEW_SALE' as const,
          title: autoConfirm ? 'New Ticket Sale' : 'Sale pending approval',
          message: `${seller.user.name} ${autoConfirm ? 'created' : 'submitted'} a ${totalQuantity}-ticket sale (${saleNumber}).`,
          entityType: 'sale',
          entityId: sale.id,
        })),
      ]);

      return sale.id;
    },
    {
      maxWait: 60000,
      timeout: 120000,
    },
  );

  const created = await prisma.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: saleInclude,
  });

  return mapSale(created);
}

export async function listSales(
  actor: AuthUser,
  query: {
    page?: number;
    pageSize?: number;
    search?: string;
    sellerId?: string;
    saleStatus?: string;
    deliveryStatus?: string;
    eventDay?: number;
    from?: string;
    to?: string;
    period?: 'today' | 'yesterday' | 'week' | 'month';
  },
) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.SaleWhereInput = {};

  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId) throw new ForbiddenError();
    where.sellerId = actor.sellerProfileId;
  } else if (query.sellerId) {
    where.sellerId = query.sellerId;
  }

  if (query.saleStatus) {
    where.saleStatus = query.saleStatus as never;
  }

  if (query.deliveryStatus) {
    where.deliveryStatus = query.deliveryStatus as never;
  }

  if (query.eventDay != null) {
    if (!isValidNavratriDay(query.eventDay)) {
      throw new ValidationAppError('eventDay must be between 1 and 10');
    }
    where.eventDay = query.eventDay;
  }

  const range = periodToRange(query.period);
  if (query.from || query.to || range) {
    where.soldAt = {
      ...(range?.gte || query.from ? { gte: range?.gte ?? new Date(query.from!) } : {}),
      ...(range?.lt || query.to ? { lt: range?.lt ?? new Date(query.to!) } : {}),
    };
  }

  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { saleNumber: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { customer: { mobile: { contains: q } } },
      { tickets: { some: { ticketNumber: { contains: q, mode: 'insensitive' } } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: saleInclude,
      orderBy: { soldAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(mapSale),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getSaleById(actor: AuthUser, id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: saleInclude,
  });
  if (!sale) throw new NotFoundError('Sale not found');

  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId || sale.sellerId !== actor.sellerProfileId) {
      throw new ForbiddenError('You cannot access this sale');
    }
  }

  return mapSale(sale);
}

function periodToRange(period?: string) {
  if (!period) return null;
  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  if (period === 'today') {
    const gte = startOfDay(now);
    const lt = new Date(gte);
    lt.setDate(lt.getDate() + 1);
    return { gte, lt };
  }
  if (period === 'yesterday') {
    const lt = startOfDay(now);
    const gte = new Date(lt);
    gte.setDate(gte.getDate() - 1);
    return { gte, lt };
  }
  if (period === 'week') {
    const gte = startOfDay(now);
    gte.setDate(gte.getDate() - 6);
    const lt = startOfDay(now);
    lt.setDate(lt.getDate() + 1);
    return { gte, lt };
  }
  if (period === 'month') {
    const gte = new Date(now.getFullYear(), now.getMonth(), 1);
    const lt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { gte, lt };
  }
  return null;
}

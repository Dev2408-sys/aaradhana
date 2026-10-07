import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import { ForbiddenError, NotFoundError, ValidationAppError } from '../utils/errors';
import { ensureEventDays } from './event-day.service';
import { createAuditLog } from './audit.service';

function isAdmin(user: AuthUser) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

function moneyNumber(d: Prisma.Decimal | number) {
  return Number(new Prisma.Decimal(d).toFixed(2));
}

/** Ensure all active ticket types have a price row for every event day. */
export async function ensureDayPrices(eventId: string) {
  await ensureEventDays(eventId);
  const days = await prisma.eventDay.findMany({
    where: { eventId },
    orderBy: { dayNumber: 'asc' },
  });
  const types = await prisma.ticketType.findMany({
    where: { eventId, active: true },
  });

  for (const day of days) {
    for (const tt of types) {
      const suggested =
        Number(tt.basePrice) < 499 ? new Prisma.Decimal(499) : tt.basePrice;
      await prisma.eventDayPrice.upsert({
        where: {
          eventDayId_ticketTypeId: {
            eventDayId: day.id,
            ticketTypeId: tt.id,
          },
        },
        update: {},
        create: {
          eventId,
          eventDayId: day.id,
          ticketTypeId: tt.id,
          dayNumber: day.dayNumber,
          basePrice: tt.basePrice,
          minimumSellingPrice: tt.minimumPrice ?? tt.basePrice,
          suggestedSellingPrice: suggested,
        },
      });
    }
  }
}

export async function listDayPricing(actor: AuthUser, eventId?: string) {
  const event = eventId
    ? await prisma.event.findUnique({ where: { id: eventId } })
    : await prisma.event.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'asc' },
      });
  if (!event) throw new NotFoundError('Active event not found');

  await ensureDayPrices(event.id);

  const types = await prisma.ticketType.findMany({
    where: { eventId: event.id, active: true },
    orderBy: { code: 'asc' },
  });
  const days = await prisma.eventDay.findMany({
    where: { eventId: event.id },
    orderBy: { dayNumber: 'asc' },
  });
  const prices = await prisma.eventDayPrice.findMany({
    where: { eventId: event.id },
  });

  const priceMap = new Map(
    prices.map((p) => [`${p.dayNumber}:${p.ticketTypeId}`, p]),
  );

  return {
    event: {
      id: event.id,
      name: event.name,
      timezone: event.timezone,
    },
    ticketTypes: types.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      defaultBasePrice: moneyNumber(t.basePrice),
    })),
    days: days.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      date: d.eventDate.toISOString().slice(0, 10),
      label: d.label,
      displayLabel: `Day ${d.dayNumber} — ${d.eventDate.toISOString().slice(8, 10)} Oct`,
      prices: types.map((t) => {
        const row = priceMap.get(`${d.dayNumber}:${t.id}`);
        return {
          ticketTypeId: t.id,
          ticketTypeCode: t.code,
          basePrice: moneyNumber(row?.basePrice ?? t.basePrice),
          minimumSellingPrice: moneyNumber(
            row?.minimumSellingPrice ?? t.minimumPrice ?? t.basePrice,
          ),
          suggestedSellingPrice: moneyNumber(
            row?.suggestedSellingPrice ??
              (Number(t.basePrice) < 499 ? 499 : t.basePrice),
          ),
        };
      }),
    })),
  };
}

export async function upsertDayPrices(
  actor: AuthUser,
  input: {
    eventId?: string;
    rows: Array<{
      dayNumber: number;
      ticketTypeId: string;
      basePrice: number;
      minimumSellingPrice?: number | null;
      suggestedSellingPrice?: number | null;
    }>;
  },
  ipAddress?: string,
) {
  if (!isAdmin(actor)) throw new ForbiddenError('Only admin can manage pricing');
  if (!input.rows?.length) {
    throw new ValidationAppError('At least one price row is required');
  }

  const event = input.eventId
    ? await prisma.event.findUnique({ where: { id: input.eventId } })
    : await prisma.event.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'asc' },
      });
  if (!event) throw new NotFoundError('Active event not found');

  await ensureDayPrices(event.id);

  for (const row of input.rows) {
    if (row.dayNumber < 1 || row.dayNumber > 10) {
      throw new ValidationAppError('dayNumber must be 1–10');
    }
    if (!(row.basePrice > 0)) {
      throw new ValidationAppError('basePrice must be positive');
    }
    const min =
      row.minimumSellingPrice != null ? row.minimumSellingPrice : row.basePrice;
    if (min < row.basePrice) {
      throw new ValidationAppError(
        'minimumSellingPrice cannot be below admin base price',
      );
    }
    if (
      row.suggestedSellingPrice != null &&
      row.suggestedSellingPrice < min
    ) {
      throw new ValidationAppError(
        'suggestedSellingPrice cannot be below minimum selling price',
      );
    }

    const day = await prisma.eventDay.findUnique({
      where: {
        eventId_dayNumber: { eventId: event.id, dayNumber: row.dayNumber },
      },
    });
    if (!day) throw new NotFoundError(`Event day ${row.dayNumber} not found`);

    const tt = await prisma.ticketType.findFirst({
      where: { id: row.ticketTypeId, eventId: event.id, active: true },
    });
    if (!tt) throw new NotFoundError('Ticket type not found');

    await prisma.eventDayPrice.upsert({
      where: {
        eventDayId_ticketTypeId: {
          eventDayId: day.id,
          ticketTypeId: tt.id,
        },
      },
      update: {
        basePrice: row.basePrice,
        minimumSellingPrice: min,
        suggestedSellingPrice: row.suggestedSellingPrice ?? min,
      },
      create: {
        eventId: event.id,
        eventDayId: day.id,
        ticketTypeId: tt.id,
        dayNumber: row.dayNumber,
        basePrice: row.basePrice,
        minimumSellingPrice: min,
        suggestedSellingPrice: row.suggestedSellingPrice ?? min,
      },
    });
  }

  await createAuditLog({
    userId: actor.id,
    action: 'DAY_PRICING_UPDATED',
    entityType: 'event',
    entityId: event.id,
    newValue: { rowsUpdated: input.rows.length },
    ipAddress,
  });

  return listDayPricing(actor, event.id);
}

/** Resolve base / min / suggested for a sale on a given Navratri day. */
export async function resolvePriceForDay(
  tx: Prisma.TransactionClient | typeof prisma,
  input: {
    eventId: string;
    ticketTypeId: string;
    eventDay?: number | null;
    fallbackBase: Prisma.Decimal;
    fallbackMinimum?: Prisma.Decimal | null;
  },
) {
  if (input.eventDay == null) {
    return {
      basePrice: input.fallbackBase,
      minimumSellingPrice: input.fallbackMinimum ?? input.fallbackBase,
      suggestedSellingPrice: null as Prisma.Decimal | null,
    };
  }

  const row = await tx.eventDayPrice.findUnique({
    where: {
      eventId_dayNumber_ticketTypeId: {
        eventId: input.eventId,
        dayNumber: input.eventDay,
        ticketTypeId: input.ticketTypeId,
      },
    },
  });

  if (!row) {
    return {
      basePrice: input.fallbackBase,
      minimumSellingPrice: input.fallbackMinimum ?? input.fallbackBase,
      suggestedSellingPrice: null as Prisma.Decimal | null,
    };
  }

  return {
    basePrice: row.basePrice,
    minimumSellingPrice: row.minimumSellingPrice ?? row.basePrice,
    suggestedSellingPrice: row.suggestedSellingPrice,
  };
}

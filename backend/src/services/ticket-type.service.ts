import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';
import { listEventDays } from './event-day.service';
import { ensureDayPrices } from './pricing.service';

export async function listActiveTicketTypes(eventId?: string) {
  const event = eventId
    ? await prisma.event.findUnique({ where: { id: eventId } })
    : await prisma.event.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'asc' },
      });

  if (!event) {
    throw new NotFoundError('Active event not found');
  }

  await ensureDayPrices(event.id);

  const types = await prisma.ticketType.findMany({
    where: { eventId: event.id, active: true },
    orderBy: { code: 'asc' },
    include: {
      sequences: {
        where: { eventId: event.id },
        select: { currentNumber: true },
      },
    },
  });

  const dayBundle = await listEventDays(event.id);
  const dayPrices = await prisma.eventDayPrice.findMany({
    where: { eventId: event.id },
  });

  return {
    event: {
      ...dayBundle.event,
      days: dayBundle.days,
    },
    ticketTypes: types.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      numberPrefix: t.numberPrefix,
      basePrice: t.basePrice,
      minimumPrice: t.minimumPrice,
      issuedCount: t.sequences[0]?.currentNumber ?? 0,
      /** Day-wise admin base / min / suggested for sellers */
      dayPricing: dayBundle.days.map((d) => {
        const row = dayPrices.find(
          (p) => p.dayNumber === d.dayNumber && p.ticketTypeId === t.id,
        );
        return {
          dayNumber: d.dayNumber,
          basePrice: Number(row?.basePrice ?? t.basePrice),
          minimumSellingPrice: Number(
            row?.minimumSellingPrice ?? t.minimumPrice ?? t.basePrice,
          ),
          suggestedSellingPrice: Number(
            row?.suggestedSellingPrice ??
              (Number(t.basePrice) < 499 ? 499 : t.basePrice),
          ),
        };
      }),
    })),
  };
}

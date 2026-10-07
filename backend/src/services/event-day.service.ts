import { EventDayStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';
import {
  getNavratriDays,
  isValidNavratriDay,
  suggestNavratriDay,
} from '../utils/navratri-days';

export type EventDayListResult = {
  event: {
    id: string;
    name: string;
    venue: string;
    address: string | null;
    gateOpening: string | null;
    showStart: string | null;
    timezone: string;
    dailyTarget: number;
    startDate: Date;
    endDate: Date;
    suggestedDay: number | null;
  };
  days: Array<{
    id: string;
    dayNumber: number;
    eventDate: Date;
    date: string;
    label: string;
    shortLabel: string;
    displayLabel: string;
    status: EventDayStatus;
  }>;
};

export async function ensureEventDays(eventId: string): Promise<EventDayListResult> {
  const days = getNavratriDays();
  const suggested = suggestNavratriDay();

  for (const d of days) {
    let status: EventDayStatus = 'UPCOMING';
    if (suggested != null) {
      if (d.day < suggested) status = 'COMPLETED';
      else if (d.day === suggested) status = 'ACTIVE';
    }

    await prisma.eventDay.upsert({
      where: {
        eventId_dayNumber: { eventId, dayNumber: d.day },
      },
      update: {
        label: d.label,
        eventDate: new Date(`${d.date}T00:00:00.000Z`),
        status,
      },
      create: {
        eventId,
        dayNumber: d.day,
        eventDate: new Date(`${d.date}T00:00:00.000Z`),
        label: d.label,
        status,
      },
    });
  }

  return buildEventDayList(eventId);
}

async function buildEventDayList(eventId: string): Promise<EventDayListResult> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError('Active event not found');

  const rows = await prisma.eventDay.findMany({
    where: { eventId: event.id },
    orderBy: { dayNumber: 'asc' },
  });

  return {
    event: {
      id: event.id,
      name: event.name,
      venue: event.venue,
      address: event.address,
      gateOpening: event.gateOpening,
      showStart: event.showStart,
      timezone: event.timezone,
      dailyTarget: event.dailyTarget,
      startDate: event.startDate,
      endDate: event.endDate,
      suggestedDay: suggestNavratriDay(),
    },
    days: rows.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      eventDate: d.eventDate,
      date: d.eventDate.toISOString().slice(0, 10),
      label: d.label,
      shortLabel: `Day ${d.dayNumber}`,
      displayLabel: `Day ${d.dayNumber} — ${d.eventDate.toISOString().slice(8, 10)} Oct`,
      status: d.status,
    })),
  };
}

export async function listEventDays(eventId?: string): Promise<EventDayListResult> {
  const event = eventId
    ? await prisma.event.findUnique({ where: { id: eventId } })
    : await prisma.event.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'asc' },
      });

  if (!event) throw new NotFoundError('Active event not found');

  const rows = await prisma.eventDay.findMany({
    where: { eventId: event.id },
    orderBy: { dayNumber: 'asc' },
  });

  // Auto-bootstrap if missing
  if (rows.length === 0) {
    return ensureEventDays(event.id);
  }

  return buildEventDayList(event.id);
}

export async function resolveEventDay(
  tx: Prisma.TransactionClient | typeof prisma,
  eventId: string,
  dayNumber: number,
) {
  if (!isValidNavratriDay(dayNumber)) return null;
  return tx.eventDay.findUnique({
    where: { eventId_dayNumber: { eventId, dayNumber } },
  });
}

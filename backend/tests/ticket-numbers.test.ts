import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/config/prisma';
import {
  formatTicketNumber,
  reserveTicketNumbers,
} from '../src/services/ticket-number.service';

describe('Phase 5 foundation — ticket number generation', () => {
  let eventId: string;
  let goldTypeId: string;
  let vipTypeId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const event = await prisma.event.findUniqueOrThrow({
      where: { slug: 'kesariya-navratri-4-0' },
    });
    eventId = event.id;

    const gold = await prisma.ticketType.findFirstOrThrow({
      where: { eventId, code: 'GOLD' },
    });
    const vip = await prisma.ticketType.findFirstOrThrow({
      where: { eventId, code: 'VIP' },
    });
    goldTypeId = gold.id;
    vipTypeId = vip.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('formats ticket numbers with padded sequence', () => {
    expect(formatTicketNumber('G', 1)).toBe('KSR-G-000001');
    expect(formatTicketNumber('V', 12)).toBe('KSR-V-000012');
  });

  it('reserves sequential unique GOLD numbers', async () => {
    const numbers = await prisma.$transaction((tx) =>
      reserveTicketNumbers(tx, {
        eventId,
        ticketTypeId: goldTypeId,
        quantity: 3,
      }),
    );

    expect(numbers).toHaveLength(3);
    expect(new Set(numbers).size).toBe(3);
    expect(numbers.every((n) => n.startsWith('KSR-G-'))).toBe(true);
  });

  it('reserves VIP numbers independently from GOLD', async () => {
    const numbers = await prisma.$transaction((tx) =>
      reserveTicketNumbers(tx, {
        eventId,
        ticketTypeId: vipTypeId,
        quantity: 2,
      }),
    );

    expect(numbers).toHaveLength(2);
    expect(numbers.every((n) => n.startsWith('KSR-V-'))).toBe(true);
  });

  it('never duplicates numbers under concurrent reservations', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        prisma.$transaction((tx) =>
          reserveTicketNumbers(tx, {
            eventId,
            ticketTypeId: goldTypeId,
            quantity: 5,
          }),
        ),
      ),
    );

    const all = results.flat();
    expect(all).toHaveLength(40);
    expect(new Set(all).size).toBe(40);
  });
});

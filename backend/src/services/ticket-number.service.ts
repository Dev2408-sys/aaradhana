import { Prisma, PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationAppError } from '../utils/errors';

type Tx = Prisma.TransactionClient | PrismaClient;

export function formatTicketNumber(prefix: string, sequence: number) {
  const safePrefix = prefix.trim().toUpperCase();
  return `KSR-${safePrefix}-${String(sequence).padStart(6, '0')}`;
}

/**
 * Reserves the next N ticket numbers for an event ticket type.
 * Uses SELECT … FOR UPDATE on ticket_sequences for concurrency safety.
 * Must be called inside a transaction used by the sale/issuance flow.
 */
export async function reserveTicketNumbers(
  tx: Tx,
  input: {
    eventId: string;
    ticketTypeId: string;
    quantity: number;
  },
): Promise<string[]> {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new ValidationAppError('Quantity must be a positive integer');
  }

  if (input.quantity > 1000) {
    throw new ValidationAppError('Cannot issue more than 1000 tickets in one batch');
  }

  const ticketType = await tx.ticketType.findFirst({
    where: {
      id: input.ticketTypeId,
      eventId: input.eventId,
      active: true,
    },
    select: { id: true, numberPrefix: true, code: true },
  });

  if (!ticketType) {
    throw new NotFoundError('Active ticket type not found for this event');
  }

  let sequence = await tx.ticketSequence.findUnique({
    where: {
      eventId_ticketTypeId: {
        eventId: input.eventId,
        ticketTypeId: input.ticketTypeId,
      },
    },
  });

  if (!sequence) {
    sequence = await tx.ticketSequence.create({
      data: {
        eventId: input.eventId,
        ticketTypeId: input.ticketTypeId,
        currentNumber: 0,
      },
    });
  }

  const locked = await tx.$queryRaw<{ id: string; current_number: number }[]>`
    SELECT id, current_number
    FROM ticket_sequences
    WHERE id = ${sequence.id}::uuid
    FOR UPDATE
  `;

  if (!locked[0]) {
    throw new NotFoundError('Ticket sequence not found');
  }

  const start = locked[0].current_number + 1;
  const end = locked[0].current_number + input.quantity;

  await tx.ticketSequence.update({
    where: { id: sequence.id },
    data: { currentNumber: end },
  });

  const numbers: string[] = [];
  for (let n = start; n <= end; n += 1) {
    numbers.push(formatTicketNumber(ticketType.numberPrefix, n));
  }

  return numbers;
}

export async function ensureTicketSequencesForEvent(tx: Tx, eventId: string) {
  const types = await tx.ticketType.findMany({
    where: { eventId, active: true },
    select: { id: true },
  });

  for (const type of types) {
    await tx.ticketSequence.upsert({
      where: {
        eventId_ticketTypeId: {
          eventId,
          ticketTypeId: type.id,
        },
      },
      update: {},
      create: {
        eventId,
        ticketTypeId: type.id,
        currentNumber: 0,
      },
    });
  }
}

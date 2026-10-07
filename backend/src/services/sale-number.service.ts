import { Prisma, PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

type Tx = Prisma.TransactionClient | PrismaClient;

const SALE_KEY = 'SALE';

export function formatSaleNumber(sequence: number) {
  return `KS-SALE-${String(sequence).padStart(6, '0')}`;
}

export async function reserveSaleNumber(tx: Tx): Promise<string> {
  let sequence = await tx.saleSequence.findUnique({ where: { key: SALE_KEY } });

  if (!sequence) {
    sequence = await tx.saleSequence.create({
      data: { key: SALE_KEY, currentNumber: 0 },
    });
  }

  const locked = await tx.$queryRaw<{ id: string; current_number: number }[]>`
    SELECT id, current_number
    FROM sale_sequences
    WHERE id = ${sequence.id}::uuid
    FOR UPDATE
  `;

  if (!locked[0]) {
    throw new NotFoundError('Sale sequence not found');
  }

  const next = locked[0].current_number + 1;

  await tx.saleSequence.update({
    where: { id: sequence.id },
    data: { currentNumber: next },
  });

  return formatSaleNumber(next);
}

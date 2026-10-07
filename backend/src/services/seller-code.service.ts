import { Prisma, PrismaClient } from '@prisma/client';

type Tx = Prisma.TransactionClient | PrismaClient;

const CODE_PREFIX = 'KSR';
const ADVISORY_LOCK_KEY = 4204001;

/**
 * Generates a unique short URL-safe seller code (KSR001, KSR002, ...).
 * Uses a transaction advisory lock to prevent race duplicates.
 */
export async function generateUniqueSellerCode(tx: Tx): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`;

  const latest = await tx.sellerProfile.findFirst({
    where: { sellerCode: { startsWith: CODE_PREFIX } },
    orderBy: { sellerCode: 'desc' },
    select: { sellerCode: true },
  });

  let next = 1;
  if (latest?.sellerCode) {
    const numeric = Number(latest.sellerCode.replace(CODE_PREFIX, ''));
    if (!Number.isNaN(numeric) && numeric >= 0) {
      next = numeric + 1;
    }
  }

  return `${CODE_PREFIX}${String(next).padStart(3, '0')}`;
}

import { prisma } from '../config/prisma';
import { backfillAccounting } from '../services/accounting.service';
import { logger } from '../utils/logger';

async function main() {
  const result = await backfillAccounting(null);
  logger.info(result, 'Accounting backfill complete');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

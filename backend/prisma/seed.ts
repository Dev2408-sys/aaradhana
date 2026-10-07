/**
 * Foundation + demo seed for Kesariya Navratri 4.0.
 * Idempotent. Demo transactional sales skip if already marked in demo_seed_meta.
 */
import { PrismaClient } from '@prisma/client';
import { runDemoSeed } from './demo-seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Kesariya Navratri 4.0 Seller OS...');
  const stats = await runDemoSeed();
  console.log('Seed complete.', stats);
  console.log('See docs/DEMO_CREDENTIALS.md for login list.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

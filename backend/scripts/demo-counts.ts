import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const days = await p.eventDay.count();
  const masters = await p.sellerProfile.count({
    where: {
      parentSellerId: null,
      OR: [{ sellerCode: 'KSR001' }, { sellerCode: { startsWith: 'MASTER' } }],
    },
  });
  const sellers = await p.sellerProfile.count({
    where: { sellerCode: { startsWith: 'S' } },
  });
  const cust = await p.customer.count({ where: { notes: { contains: 'DEMO' } } });
  const sales = await p.sale.count({ where: { dataSource: 'DEMO' } });
  const tickets = await p.ticket.count({ where: { sale: { dataSource: 'DEMO' } } });
  const gold = await p.ticket.count({
    where: { zone: 'GOLD', sale: { dataSource: 'DEMO' } },
  });
  const vip = await p.ticket.count({
    where: { zone: 'VIP', sale: { dataSource: 'DEMO' } },
  });
  const cp = await p.customerPayment.count({ where: { notes: { contains: 'DEMO' } } });
  const sp = await p.sellerPayment.count({ where: { notes: { contains: 'DEMO' } } });
  const ledger = await p.sellerLedgerEntry.count();
  const notif = await p.notification.count({ where: { message: { contains: 'DEMO' } } });
  const byDay = await p.sale.groupBy({
    by: ['eventDay'],
    where: { dataSource: 'DEMO' },
    _sum: { totalQuantity: true },
    _count: true,
    orderBy: { eventDay: 'asc' },
  });
  console.log(
    JSON.stringify(
      { days, masters, sellers, cust, sales, tickets, gold, vip, cp, sp, ledger, notif, byDay },
      null,
      2,
    ),
  );
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());

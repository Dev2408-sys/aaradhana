import { Prisma } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { getNavratriDays } from '../src/utils/navratri-days';

const app = createApp();

async function login(mobile: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ mobile, password: 'Kesariya@123' });
  expect(res.status).toBe(200);
  return res.body.data as {
    accessToken: string;
    user: { id: string; sellerProfile: { id: string } | null };
  };
}

describe('Demo seed — Kesariya Navratri 4.0 Day 1–10', () => {
  let adminToken: string;
  let sellerToken: string;
  let sellerId: string;
  let eventId: string;

  beforeAll(async () => {
    await prisma.$connect();
    adminToken = (await login('8888888888')).accessToken;
    const seller = await login('9122000001');
    sellerToken = seller.accessToken;
    sellerId = seller.user.sellerProfile!.id;

    const event = await prisma.event.findUniqueOrThrow({
      where: { slug: 'kesariya-navratri-4-0' },
    });
    eventId = event.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('has 10 event days with correct dates', async () => {
    const days = await prisma.eventDay.findMany({
      where: { eventId },
      orderBy: { dayNumber: 'asc' },
    });
    expect(days).toHaveLength(10);

    const expected = getNavratriDays();
    for (let i = 0; i < 10; i++) {
      expect(days[i]!.dayNumber).toBe(i + 1);
      expect(days[i]!.eventDate.toISOString().slice(0, 10)).toBe(expected[i]!.date);
    }

    const api = await request(app)
      .get('/api/event-days')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(api.status).toBe(200);
    expect(api.body.data.days).toHaveLength(10);
  });

  it('has demo admin + master + seller accounts', async () => {
    const superAdmin = await prisma.user.findUnique({ where: { mobile: '9999999999' } });
    expect(superAdmin?.role).toBe('SUPER_ADMIN');

    const masters = await prisma.sellerProfile.count({
      where: {
        OR: [
          { sellerCode: 'KSR001' },
          { sellerCode: { startsWith: 'MASTER' } },
        ],
        parentSellerId: null,
        activationStatus: 'ACTIVE',
      },
    });
    expect(masters).toBeGreaterThanOrEqual(5);

    const sellers = await prisma.sellerProfile.count({
      where: {
        sellerCode: { in: Array.from({ length: 20 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`) },
        activationStatus: 'ACTIVE',
      },
    });
    expect(sellers).toBe(20);
  });

  it('has valid hierarchy without cycles (S01 under KSR001)', async () => {
    const s01 = await prisma.sellerProfile.findUniqueOrThrow({ where: { sellerCode: 'S01' } });
    const master = await prisma.sellerProfile.findUniqueOrThrow({ where: { sellerCode: 'KSR001' } });
    expect(s01.parentSellerId).toBe(master.id);
    expect(master.parentSellerId).toBeNull();
  });

  it('has demo customers, sales, tickets with unique numbers', async () => {
    const customers = await prisma.customer.count({
      where: { notes: { contains: 'DEMO' } },
    });
    expect(customers).toBeGreaterThanOrEqual(100);

    const demoSales = await prisma.sale.count({ where: { dataSource: 'DEMO' } });
    const demoTickets = await prisma.ticket.count({
      where: { sale: { dataSource: 'DEMO' } },
    });
    expect(demoSales).toBeGreaterThan(100);
    expect(demoTickets).toBeGreaterThanOrEqual(500);
    expect(demoTickets).toBeLessThanOrEqual(900);

    const saleNumbers = await prisma.sale.findMany({
      where: { dataSource: 'DEMO' },
      select: { saleNumber: true },
    });
    expect(new Set(saleNumbers.map((s) => s.saleNumber)).size).toBe(saleNumbers.length);

    const ticketNumbers = await prisma.ticket.findMany({
      where: { sale: { dataSource: 'DEMO' } },
      select: { ticketNumber: true },
    });
    expect(new Set(ticketNumbers.map((t) => t.ticketNumber)).size).toBe(
      ticketNumbers.length,
    );
  });

  it('reconciles sale totals (no negative outstanding)', async () => {
    const sales = await prisma.sale.findMany({
      where: { dataSource: 'DEMO', saleStatus: 'CONFIRMED' },
      select: {
        id: true,
        totalAmount: true,
        baseAmount: true,
        sellerProfit: true,
      },
      take: 50,
    });

    for (const sale of sales) {
      expect(sale.sellerProfit.eq(sale.totalAmount.minus(sale.baseAmount))).toBe(true);
      const paid = await prisma.customerPayment.aggregate({
        where: { saleId: sale.id, status: 'RECORDED' },
        _sum: { amount: true },
      });
      const collected = paid._sum.amount ?? new Prisma.Decimal(0);
      expect(collected.lte(sale.totalAmount)).toBe(true);
      expect(sale.totalAmount.minus(collected).gte(0)).toBe(true);
    }
  });

  it('day filter: Day 1 / Day 10 / All Days', async () => {
    const day1 = await request(app)
      .get('/api/sales')
      .query({ eventDay: 1, pageSize: 100 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(day1.status).toBe(200);
    expect(day1.body.data.items.every((s: { eventDay: number }) => s.eventDay === 1)).toBe(
      true,
    );
    expect(day1.body.data.pagination.total).toBeGreaterThan(0);

    const day10 = await request(app)
      .get('/api/sales')
      .query({ eventDay: 10, pageSize: 100 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(day10.status).toBe(200);
    expect(day10.body.data.items.every((s: { eventDay: number }) => s.eventDay === 10)).toBe(
      true,
    );

    const all = await request(app)
      .get('/api/sales')
      .query({ pageSize: 1 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(all.status).toBe(200);
    expect(all.body.data.pagination.total).toBeGreaterThan(
      day1.body.data.pagination.total,
    );
  });

  it('seller ownership filter vs admin global', async () => {
    const mine = await request(app)
      .get('/api/sales')
      .query({ pageSize: 50 })
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(mine.status).toBe(200);
    expect(
      mine.body.data.items.every(
        (s: { seller: { id: string } }) => s.seller.id === sellerId,
      ),
    ).toBe(true);

    const other = await prisma.sellerProfile.findFirst({
      where: { sellerCode: 'S20' },
    });
    expect(other).toBeTruthy();

    const forbidden = await request(app)
      .get('/api/sales')
      .query({ sellerId: other!.id })
      .set('Authorization', `Bearer ${sellerToken}`);
    // seller query ignores other sellerId / still scoped to self
    expect(forbidden.status).toBe(200);
    expect(
      forbidden.body.data.items.every(
        (s: { seller: { id: string } }) => s.seller.id === sellerId,
      ),
    ).toBe(true);

    const adminAll = await request(app)
      .get('/api/sales')
      .query({ pageSize: 1 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminAll.body.data.pagination.total).toBeGreaterThan(
      mine.body.data.pagination.total,
    );
  });

  it('demo seed meta marks dataset as seeded', async () => {
    const meta = await prisma.demoSeedMeta.findUnique({
      where: { key: 'kesariya-navratri-4-0-demo-v1' },
    });
    expect(meta).toBeTruthy();
  });
});

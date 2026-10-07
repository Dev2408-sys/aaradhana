import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

const app = createApp();

async function login(mobile: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ mobile, password: 'Kesariya@123' });
  expect(res.status).toBe(200);
  return res.body.data as {
    accessToken: string;
    user: { id: string; sellerProfile: { id: string } | null; role: string };
  };
}

describe('Phase 8 — Dashboard APIs', () => {
  let adminToken: string;
  let amitToken: string;
  let amitId: string;
  let rajToken: string;
  let rajId: string;

  beforeAll(async () => {
    await prisma.$connect();
    adminToken = (await login('8888888888')).accessToken;
    const amit = await login('6666666666');
    amitToken = amit.accessToken;
    amitId = amit.user.sellerProfile!.id;
    const raj = await login('7777777777');
    rajToken = raj.accessToken;
    rajId = raj.user.sellerProfile!.id;
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('admin summary returns KPIs from DB (not hardcoded)', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.event.name).toMatch(/Kesariya/i);
    expect(res.body.data.kpis).toBeDefined();
    expect(typeof res.body.data.kpis.totalTicketsSold).toBe('number');
    expect(res.body.data.kpis.totalTicketsSold).toBeGreaterThan(0);
  });

  it('day filter changes ticket totals', async () => {
    const all = await request(app)
      .get('/api/dashboard/admin/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    const day1 = await request(app)
      .get('/api/dashboard/admin/summary')
      .query({ eventDay: 1 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(day1.status).toBe(200);
    expect(day1.body.data.kpis.totalTicketsSold).toBeLessThanOrEqual(
      all.body.data.kpis.totalTicketsSold,
    );

    const dbDay1 = await prisma.sale.aggregate({
      where: { saleStatus: 'CONFIRMED', eventDay: 1 },
      _sum: { totalQuantity: true },
    });
    expect(day1.body.data.kpis.totalTicketsSold).toBe(dbDay1._sum.totalQuantity ?? 0);
  });

  it('gold + vip equals ticket mix total', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin/ticket-mix')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.gold + res.body.data.vip).toBe(res.body.data.total);
  });

  it('top sellers ranked by tickets then sales value', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin/top-sellers')
      .query({ limit: 10 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const items = res.body.data.items as Array<{
      ticketsSold: number;
      salesValue: number;
      name: string;
    }>;
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].name).not.toMatch(/^Seller \d+$/);
    for (let i = 1; i < items.length; i += 1) {
      const prev = items[i - 1];
      const cur = items[i];
      expect(prev.ticketsSold).toBeGreaterThanOrEqual(cur.ticketsSold);
      if (prev.ticketsSold === cur.ticketsSold) {
        expect(prev.salesValue).toBeGreaterThanOrEqual(cur.salesValue);
      }
    }
  });

  it('target progress uses event dailyTarget * 10', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin/target-progress')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.target).toBe(res.body.data.dailyTarget * 10);
    expect(res.body.data.projectedFinalLabel).toMatch(/pace projection/i);
  });

  it('daily performance returns 10 days', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin/daily-performance')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.days).toHaveLength(10);
  });

  it('seller cannot access admin summary', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin/summary')
      .set('Authorization', `Bearer ${amitToken}`);
    expect(res.status).toBe(403);
  });

  it('seller summary is scoped to self', async () => {
    const res = await request(app)
      .get('/api/dashboard/seller/summary')
      .set('Authorization', `Bearer ${amitToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.my.totalTickets).toBe('number');

    const db = await prisma.sale.aggregate({
      where: { sellerId: amitId, saleStatus: 'CONFIRMED' },
      _sum: { totalQuantity: true },
    });
    expect(res.body.data.my.totalTickets).toBe(db._sum.totalQuantity ?? 0);
  });

  it('master team performance only returns own team', async () => {
    const res = await request(app)
      .get('/api/dashboard/master/team-performance')
      .set('Authorization', `Bearer ${rajToken}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data.items as Array<{ sellerId: string }>).map((i) => i.sellerId);
    expect(ids).toContain(rajId);
    // Amit (KSR002) is under Raj — should appear when seeded
    expect(ids).toContain(amitId);
  });

  it('seller cannot hit master endpoints', async () => {
    const res = await request(app)
      .get('/api/dashboard/master/summary')
      .set('Authorization', `Bearer ${amitToken}`);
    expect(res.status).toBe(403);
  });

  it('payment + settlement summaries return slices', async () => {
    const pay = await request(app)
      .get('/api/dashboard/admin/payment-summary')
      .set('Authorization', `Bearer ${adminToken}`);
    const set = await request(app)
      .get('/api/dashboard/admin/settlement-summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pay.status).toBe(200);
    expect(set.status).toBe(200);
    expect(Array.isArray(pay.body.data.slices)).toBe(true);
    expect(Array.isArray(set.body.data.slices)).toBe(true);
  });

  it('customer paid + outstanding reconciles with sales value (all days)', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    const k = res.body.data.kpis;
    expect(
      Number((k.customerCollection + k.customerOutstanding).toFixed(2)),
    ).toBeCloseTo(k.totalSalesValue, 1);
  });

  it('event pulse and health load', async () => {
    const pulse = await request(app)
      .get('/api/dashboard/admin/event-pulse')
      .set('Authorization', `Bearer ${adminToken}`);
    const health = await request(app)
      .get('/api/dashboard/admin/event-health')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pulse.status).toBe(200);
    expect(health.status).toBe(200);
    expect(['ON_TRACK', 'WATCH', 'ATTENTION']).toContain(health.body.data.status);
  });
});

import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

const app = createApp();

async function login(mobile: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ mobile, password: 'Kesariya@123' });
  expect(res.status).toBe(200);
  return res.body.data.accessToken as string;
}

describe('day pricing + UPI settings', () => {
  let adminToken: string;
  let sellerToken: string;

  beforeAll(async () => {
    await prisma.$connect();
    adminToken = await login('8888888888');
    sellerToken = await login('6666666666');
  }, 60_000);

  it('admin can load and save day-wise pricing', async () => {
    const get = await request(app)
      .get('/api/pricing')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(get.status).toBe(200);
    expect(get.body.data.days.length).toBe(10);
    expect(get.body.data.ticketTypes.length).toBeGreaterThanOrEqual(2);

    const day1 = get.body.data.days[0];
    const row = day1.prices[0];
    const put = await request(app)
      .put('/api/pricing')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rows: [
          {
            dayNumber: day1.dayNumber,
            ticketTypeId: row.ticketTypeId,
            basePrice: row.basePrice,
            minimumSellingPrice: row.minimumSellingPrice,
            suggestedSellingPrice: row.suggestedSellingPrice,
          },
        ],
      });
    expect(put.status).toBe(200);
  });

  it('seller ticket types include dayPricing', async () => {
    const res = await request(app)
      .get('/api/ticket-types')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    const gold = res.body.data.ticketTypes.find(
      (t: { code: string }) => t.code === 'GOLD',
    );
    expect(gold.dayPricing).toHaveLength(10);
    expect(gold.dayPricing[0].basePrice).toBeGreaterThan(0);
  });

  it('admin can update UPI settings; seller can read them', async () => {
    const put = await request(app)
      .put('/api/payment-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        upiId: 'kesariya@upi',
        upiPayeeName: 'Kesariya Navratri 4.0',
        upiInstructions: 'Pay and submit UTR',
        requireUtrForUpi: true,
      });
    expect(put.status).toBe(200);

    const sellerView = await request(app)
      .get('/api/payment-settings')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(sellerView.status).toBe(200);
    expect(sellerView.body.data.upiId).toBe('kesariya@upi');
    expect(sellerView.body.data.canEdit).toBe(false);
  });

  it('returns UPI deep link and QR for sellers', async () => {
    const res = await request(app)
      .get('/api/payment-settings')
      .query({ amount: 400 })
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.upiId).toBeTruthy();
    expect(res.body.data.upiDeepLink).toMatch(/^upi:\/\//);
    expect(res.body.data.qrCodeDataUrl || res.body.data.displayQrUrl).toBeTruthy();
  });

  it('rejects seller sale without payment screenshot', async () => {
    const types = await request(app)
      .get('/api/ticket-types')
      .set('Authorization', `Bearer ${sellerToken}`);
    const goldId = types.body.data.ticketTypes.find(
      (t: { code: string }) => t.code === 'GOLD',
    ).id;

    const mobile = `91${String(Date.now()).slice(-8)}`;
    const sale = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        eventDay: 1,
        customer: { name: 'No Proof', mobile },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 799 }],
      });
    expect(sale.status).toBe(400);
    expect(String(sale.body.error?.message ?? sale.body.message)).toMatch(
      /screenshot|upload|proof/i,
    );
  });

  it('supports multiple UPI accounts and day-wise rotate after approve', async () => {
    const event = await prisma.event.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startDate: 'asc' },
    });
    expect(event).toBeTruthy();

    // Reset accounts for a clean rotate check
    await prisma.sale.updateMany({
      where: { eventId: event!.id, upiAccountId: { not: null } },
      data: { upiAccountId: null },
    });
    await prisma.upiAccount.deleteMany({ where: { eventId: event!.id } });

    const a1 = await request(app)
      .post('/api/payment-settings/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: 'Account A',
        upiId: 'rotate-a@upi',
        payeeName: 'Kesariya A',
        rotateLimitAmount: 500,
        setAsMain: true,
      });
    expect(a1.status).toBe(201);
    expect(a1.body.data.isReceiving).toBe(true);

    const a2 = await request(app)
      .post('/api/payment-settings/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: 'Account B',
        upiId: 'rotate-b@upi',
        payeeName: 'Kesariya B',
        rotateLimitAmount: 500,
      });
    expect(a2.status).toBe(201);

    const sellerView = await request(app)
      .get('/api/payment-settings')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(sellerView.status).toBe(200);
    expect(sellerView.body.data.upiId).toBe('rotate-a@upi');
    expect(sellerView.body.data.receivingAccount?.label).toBe('Account A');

    const types = await request(app)
      .get('/api/ticket-types')
      .set('Authorization', `Bearer ${sellerToken}`);
    const goldId = types.body.data.ticketTypes.find(
      (t: { code: string }) => t.code === 'GOLD',
    ).id;
    const basePrice = Number(
      types.body.data.ticketTypes.find((t: { code: string }) => t.code === 'GOLD')
        .dayPricing?.[0]?.basePrice ?? 400,
    );

    // Create enough approved base to exceed 500 on Account A
    const qty = Math.ceil(600 / basePrice);
    const mobile = `92${String(Date.now()).slice(-8)}`;
    const created = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        eventDay: 1,
        customer: { name: 'Rotate Test', mobile },
        items: [{ ticketTypeId: goldId, quantity: qty, sellingPrice: 799 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/rotate-test.jpg',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.upiIdSnapshot).toBe('rotate-a@upi');
    expect(created.body.data.upiAccountLabel).toBe('Account A');

    // Pending approval must NOT rotate yet
    let settings = await request(app)
      .get('/api/payment-settings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(settings.body.data.receivingAccount?.upiId).toBe('rotate-a@upi');

    const approve = await request(app)
      .post(`/api/sales/${created.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        confirmCustomerName: 'Rotate Test',
        confirmCustomerMobile: mobile,
      });
    expect(approve.status).toBe(200);

    settings = await request(app)
      .get('/api/payment-settings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(settings.body.data.receivingAccount?.upiId).toBe('rotate-b@upi');

    const stats = await request(app)
      .get('/api/payment-settings/upi-stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(stats.status).toBe(200);
    const accountA = stats.body.data.accounts.find(
      (a: { upiId: string }) => a.upiId === 'rotate-a@upi',
    );
    expect(accountA.receivedBase).toBeGreaterThanOrEqual(500);
    expect(accountA.approvedCount).toBeGreaterThanOrEqual(1);
  });
});

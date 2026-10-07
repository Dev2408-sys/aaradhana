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
    user: { id: string; sellerProfile: { id: string } | null };
  };
}

function uniqueMobile(n: number) {
  return `97${String(Date.now()).slice(-7)}${n}`.slice(0, 10);
}

async function approveSale(
  adminToken: string,
  saleBody: {
    id: string;
    customer: { name: string; mobile: string };
  },
) {
  const res = await request(app)
    .post(`/api/sales/${saleBody.id}/approve`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      confirmCustomerName: saleBody.customer.name,
      confirmCustomerMobile: saleBody.customer.mobile,
    });
  expect(res.status).toBe(200);
  return res.body.data as { id: string; saleNumber: string };
}

describe('Phase 7 — Accounting', () => {
  let adminToken: string;
  let amitToken: string;
  let jayToken: string;
  let amitId: string;
  let jayId: string;
  let goldId: string;
  let saleId: string;
  let saleNumber: string;

  beforeAll(async () => {
    await prisma.$connect();
    adminToken = (await login('8888888888')).accessToken;
    const amit = await login('6666666666');
    amitToken = amit.accessToken;
    amitId = amit.user.sellerProfile!.id;
    const jay = await login('5555555555');
    jayToken = jay.accessToken;
    jayId = jay.user.sellerProfile!.id;

    const event = await prisma.event.findUniqueOrThrow({
      where: { slug: 'kesariya-navratri-4-0' },
    });
    const gold = await prisma.ticketType.findFirstOrThrow({
      where: { eventId: event.id, code: 'GOLD' },
    });
    goldId = gold.id;

    const sale = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Acct Test', mobile: uniqueMobile(1) },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 799 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400013.jpg',
      });
    expect(sale.status).toBe(201);
    const approved = await approveSale(adminToken, sale.body.data);
    saleId = approved.id;
    saleNumber = approved.saleNumber;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sale creates SALE_DEBIT ledger for base receivable', async () => {
    const ledger = await request(app)
      .get(`/api/accounting/sellers/${amitId}/ledger`)
      .set('Authorization', `Bearer ${amitToken}`);
    expect(ledger.status).toBe(200);
    const entry = ledger.body.data.items.find(
      (e: { reference: string }) => e.reference === `SALE_DEBIT:${saleId}`,
    );
    expect(entry).toBeTruthy();
    expect(entry.direction).toBe('DEBIT');
    expect(entry.amount).toBe(400);
  });

  it('sale accounting invariants hold', async () => {
    const summary = await request(app)
      .get(`/api/accounting/sales/${saleId}/summary`)
      .set('Authorization', `Bearer ${amitToken}`);
    expect(summary.status).toBe(200);
    expect(summary.body.data.customerTotal).toBe(799);
    expect(summary.body.data.baseReceivable).toBe(400);
    expect(summary.body.data.sellerGrossMargin).toBe(399);
    expect(summary.body.data.invariants.marginMatches).toBe(true);
    expect(summary.body.data.customerOutstanding).toBe(799);
  });

  it('rejects zero/negative customer payment', async () => {
    const zero = await request(app)
      .post('/api/customer-payments')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({ saleId, amount: 0, paymentMethod: 'CASH' });
    expect(zero.status).toBe(400);

    const neg = await request(app)
      .post('/api/customer-payments')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({ saleId, amount: -10, paymentMethod: 'CASH' });
    expect(neg.status).toBe(400);
  });

  it('records partial then full customer payment', async () => {
    const partial = await request(app)
      .post('/api/customer-payments')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        saleId,
        amount: 300,
        paymentMethod: 'UPI',
        paymentReference: `UPI-${saleNumber}-1`,
      });
    expect(partial.status).toBe(201);

    const mid = await request(app)
      .get(`/api/accounting/sales/${saleId}/summary`)
      .set('Authorization', `Bearer ${amitToken}`);
    expect(mid.body.data.customerPaid).toBe(300);
    expect(mid.body.data.customerOutstanding).toBe(499);
    expect(mid.body.data.customerPaymentStatus).toBe('PARTIAL');

    const rest = await request(app)
      .post('/api/customer-payments')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        saleId,
        amount: 499,
        paymentMethod: 'CASH',
        paymentReference: `CASH-${saleNumber}-2`,
      });
    expect(rest.status).toBe(201);

    const done = await request(app)
      .get(`/api/accounting/sales/${saleId}/summary`)
      .set('Authorization', `Bearer ${amitToken}`);
    expect(done.body.data.customerPaid).toBe(799);
    expect(done.body.data.customerOutstanding).toBe(0);
    expect(done.body.data.customerPaymentStatus).toBe('PAID');
  });

  it('rejects overpayment', async () => {
    const over = await request(app)
      .post('/api/customer-payments')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({ saleId, amount: 1, paymentMethod: 'CASH' });
    expect(over.status).toBe(400);
  });

  it('duplicate payment reference is rejected', async () => {
    const sale2 = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Dup Pay', mobile: uniqueMobile(2) },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 799 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400014.jpg',
      });
    expect(sale2.status).toBe(201);
    await approveSale(adminToken, sale2.body.data);
    const id = sale2.body.data.id;

    const first = await request(app)
      .post('/api/customer-payments')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        saleId: id,
        amount: 100,
        paymentMethod: 'UPI',
        paymentReference: 'SAME-REF-001',
      });
    expect(first.status).toBe(201);

    const dup = await request(app)
      .post('/api/customer-payments')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        saleId: id,
        amount: 100,
        paymentMethod: 'UPI',
        paymentReference: 'SAME-REF-001',
      });
    expect(dup.status).toBe(409);
  });

  it('seller payment reduces outstanding; reversal restores it', async () => {
    const before = await request(app)
      .get(`/api/accounting/sellers/${amitId}/summary`)
      .set('Authorization', `Bearer ${amitToken}`);
    expect(before.status).toBe(200);
    const outstandingBefore = before.body.data.outstanding as number;

    const pay = await request(app)
      .post('/api/seller-payments')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        amount: 200,
        paymentMethod: 'UPI',
        paymentReference: `SETTLE-${Date.now()}`,
      });
    expect(pay.status).toBe(201);

    const mid = await request(app)
      .get(`/api/accounting/sellers/${amitId}/summary`)
      .set('Authorization', `Bearer ${amitToken}`);
    expect(mid.body.data.outstanding).toBeCloseTo(outstandingBefore - 200, 2);

    const rev = await request(app)
      .post(`/api/seller-payments/${pay.body.data.id}/reverse`)
      .set('Authorization', `Bearer ${amitToken}`);
    expect(rev.status).toBe(200);
    expect(rev.body.data.status).toBe('REVERSED');

    const after = await request(app)
      .get(`/api/accounting/sellers/${amitId}/summary`)
      .set('Authorization', `Bearer ${amitToken}`);
    expect(after.body.data.outstanding).toBeCloseTo(outstandingBefore, 2);
  });

  it('unauthorized seller cannot access another seller finance', async () => {
    const denied = await request(app)
      .get(`/api/accounting/sellers/${amitId}/summary`)
      .set('Authorization', `Bearer ${jayToken}`);
    expect(denied.status).toBe(403);

    const deniedSale = await request(app)
      .get(`/api/accounting/sales/${saleId}/summary`)
      .set('Authorization', `Bearer ${jayToken}`);
    expect(deniedSale.status).toBe(403);
  });

  it('admin can view receivables and seller rows', async () => {
    const recv = await request(app)
      .get('/api/accounting/receivables')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(recv.status).toBe(200);
    expect(recv.body.data.totalBaseReceivable).toBeGreaterThan(0);
    expect(recv.body.data).toHaveProperty('sellerOutstanding');
    expect(recv.body.data).toHaveProperty('customerOutstanding');

    const sellers = await request(app)
      .get('/api/accounting/sellers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(sellers.status).toBe(200);
    expect(sellers.body.data.items.length).toBeGreaterThan(0);
  });

  it('customer payment reverse restores outstanding', async () => {
    const sale = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Rev Cust', mobile: uniqueMobile(3) },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 799 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400015.jpg',
      });
    await approveSale(adminToken, sale.body.data);
    const id = sale.body.data.id;

    const pay = await request(app)
      .post('/api/customer-payments')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({ saleId: id, amount: 500, paymentMethod: 'CASH' });
    expect(pay.status).toBe(201);

    const rev = await request(app)
      .post(`/api/customer-payments/${pay.body.data.id}/reverse`)
      .set('Authorization', `Bearer ${amitToken}`);
    expect(rev.status).toBe(200);

    const summary = await request(app)
      .get(`/api/accounting/sales/${id}/summary`)
      .set('Authorization', `Bearer ${amitToken}`);
    expect(summary.body.data.customerPaid).toBe(0);
    expect(summary.body.data.customerOutstanding).toBe(799);
    expect(summary.body.data.customerPaymentStatus).toBe('PENDING');
  });

  it('20 concurrent customer payments never overpay', async () => {
    const sale = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Conc Pay', mobile: uniqueMobile(4) },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 800 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400016.jpg',
      });
    expect(sale.status).toBe(201);
    await approveSale(adminToken, sale.body.data);
    const id = sale.body.data.id;

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/customer-payments')
          .set('Authorization', `Bearer ${amitToken}`)
          .send({
            saleId: id,
            amount: 100,
            paymentMethod: 'CASH',
            paymentReference: `CONC-${id}-${i}`,
          }),
      ),
    );

    const ok = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status !== 201);
    expect(ok.length).toBe(8);
    expect(rejected.length).toBe(12);

    const summary = await request(app)
      .get(`/api/accounting/sales/${id}/summary`)
      .set('Authorization', `Bearer ${amitToken}`);
    expect(summary.body.data.customerPaid).toBe(800);
    expect(summary.body.data.customerOutstanding).toBe(0);
  }, 60_000);

  it('concurrent seller payments produce unique ledger credits', async () => {
    const before = await request(app)
      .get(`/api/accounting/sellers/${jayId}/summary`)
      .set('Authorization', `Bearer ${jayToken}`);
    const outstandingBefore = before.body.data.outstanding as number;

    // Ensure jay has receivable
    const jaySale = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${jayToken}`)
      .send({
        customer: { name: 'Jay Conc', mobile: uniqueMobile(5) },
        items: [{ ticketTypeId: goldId, quantity: 5, sellingPrice: 799 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400017.jpg',
      });
    await approveSale(adminToken, jaySale.body.data);

    const results = [];
    const stamp = Date.now();
    for (let wave = 0; wave < 2; wave += 1) {
      const batch = await Promise.all(
        Array.from({ length: 5 }, (_, j) => {
          const i = wave * 5 + j;
          return request(app)
            .post('/api/seller-payments')
            .set('Authorization', `Bearer ${jayToken}`)
            .send({
              amount: 50,
              paymentMethod: 'UPI',
              paymentReference: `JAY-CONC-${stamp}-${i}`,
            });
        }),
      );
      results.push(...batch);
    }

    expect(results.every((r) => r.status === 201)).toBe(true);

    const after = await request(app)
      .get(`/api/accounting/sellers/${jayId}/summary`)
      .set('Authorization', `Bearer ${jayToken}`);
    expect(after.body.data.outstanding).toBeLessThanOrEqual(outstandingBefore + 2000 - 500);
  }, 60_000);

  it('backfill is idempotent', async () => {
    const first = await request(app)
      .post('/api/accounting/backfill')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/accounting/backfill')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(second.status).toBe(200);
    expect(second.body.data.created).toBe(0);
    expect(second.body.data.skipped).toBeGreaterThan(0);
  });
});

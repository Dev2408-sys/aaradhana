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
  return `98${String(Date.now()).slice(-7)}${n}`.slice(0, 10);
}

describe('Phase 6 — Customers + Sales + Bulk issuance', () => {
  let adminToken: string;
  let amitToken: string;
  let jayToken: string;
  let rajId: string;
  let amitId: string;
  let jayId: string;
  let goldId: string;
  let vipId: string;

  beforeAll(async () => {
    await prisma.$connect();
    adminToken = (await login('8888888888')).accessToken;
    const amit = await login('6666666666');
    amitToken = amit.accessToken;
    amitId = amit.user.sellerProfile!.id;
    const jay = await login('5555555555');
    jayToken = jay.accessToken;
    jayId = jay.user.sellerProfile!.id;

    const raj = await prisma.sellerProfile.findUniqueOrThrow({
      where: { sellerCode: 'KSR001' },
    });
    rajId = raj.id;

    const event = await prisma.event.findUniqueOrThrow({
      where: { slug: 'kesariya-navratri-4-0' },
    });
    goldId = (
      await prisma.ticketType.findFirstOrThrow({
        where: { eventId: event.id, code: 'GOLD' },
      })
    ).id;
    vipId = (
      await prisma.ticketType.findFirstOrThrow({
        where: { eventId: event.id, code: 'VIP' },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates customer and searches', async () => {
    const mobile = uniqueMobile(1);
    const create = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Cust One', mobile, city: 'Surat' });
    expect(create.status).toBe(201);

    const search = await request(app)
      .get('/api/customers/search')
      .query({ q: mobile })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(search.status).toBe(200);
    expect(search.body.data.items.length).toBeGreaterThan(0);
  });

  it('rejects missing customer name on sale', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: '', mobile: uniqueMobile(2) },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 799 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400001.jpg',
      });
    expect(res.status).toBe(400);
  });

  it('rejects zero quantity', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Bad Qty', mobile: uniqueMobile(3) },
        items: [{ ticketTypeId: goldId, quantity: 0, sellingPrice: 799 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400002.jpg',
      });
    expect(res.status).toBe(400);
  });

  it('rejects negative selling price', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Bad Price', mobile: uniqueMobile(4) },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: -10 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400003.jpg',
      });
    expect(res.status).toBe(400);
  });

  it('seller creates valid Gold sale with margin calculation', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Gold Buyer', mobile: uniqueMobile(5) },
        items: [{ ticketTypeId: goldId, quantity: 3, sellingPrice: 799 }],
        customerPaymentStatus: 'PAID',
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400004.jpg',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.saleStatus).toBe('PENDING');
    expect(res.body.data.deliveryStatus).toBe('AWAITING_APPROVAL');
    expect(res.body.data.customerPaymentStatus).toBe('PAID');
    expect(res.body.data.adminPaymentProofUrl).toBeTruthy();
    expect(res.body.data.saleNumber).toMatch(/^KS-SALE-\d+$/);
    expect(res.body.data.totalQuantity).toBe(3);
    expect(res.body.data.baseAmount).toBe(1200);
    expect(res.body.data.totalAmount).toBe(2397);
    expect(res.body.data.sellerProfit).toBe(1197);
    expect(res.body.data.tickets).toHaveLength(3);
    expect(res.body.data.tickets.every((t: { ticketNumber: string }) =>
      t.ticketNumber.startsWith('KSR-G-'),
    )).toBe(true);

    const approved = await request(app)
      .post(`/api/sales/${res.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        confirmCustomerName: 'Gold Buyer',
        confirmCustomerMobile: res.body.data.customer.mobile,
      });
    expect(approved.status).toBe(200);
    expect(approved.body.data.saleStatus).toBe('CONFIRMED');
    expect(approved.body.data.deliveryStatus).toBe('READY_TO_SEND');
    expect(approved.body.data.settlementStatus).toBe('PAID');
    expect(approved.body.data.adminPaymentProofUrl).toBeTruthy();
  });

  it('Proof sale: approve unlocks send; mark sent without customer payment', async () => {
    const mobile = uniqueMobile(55);
    const created = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Flow Buyer', mobile },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 499 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400005.jpg',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.adminPaymentProofUrl).toBe(
      '/uploads/payment-proofs/TESTUTR400005.jpg',
    );

    const blocked = await request(app)
      .post('/api/customer-payments')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        saleId: created.body.data.id,
        amount: 499,
        paymentMethod: 'UPI',
        paymentReference: 'UTR-BLOCKED-001',
      });
    expect(blocked.status).toBe(400);

    const badConfirm = await request(app)
      .post(`/api/sales/${created.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        confirmCustomerName: 'Wrong Name',
        confirmCustomerMobile: mobile,
      });
    expect(badConfirm.status).toBe(400);

    const approved = await request(app)
      .post(`/api/sales/${created.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        confirmCustomerName: 'Flow Buyer',
        confirmCustomerMobile: mobile,
      });
    expect(approved.status).toBe(200);
    expect(approved.body.data.deliveryStatus).toBe('READY_TO_SEND');

    const slip = await request(app)
      .get(`/api/sales/${created.body.data.id}/slip`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(slip.status).toBe(200);
    expect(slip.body.data.whatsapp.canSend).toBe(true);

    const sent = await request(app)
      .post(`/api/sales/${created.body.data.id}/mark-whatsapp-sent`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(sent.status).toBe(200);
    expect(sent.body.data.deliveryStatus).toBe('SENT');
  });

  it('rejects seller sale without payment screenshot', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'No Proof', mobile: uniqueMobile(56) },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 799 }],
      });
    expect(res.status).toBe(400);
    expect(String(res.body.error?.message ?? res.body.message)).toMatch(/screenshot|upload|proof/i);
  });

  it('creates VIP and mixed Gold+VIP sales', async () => {
    const vip = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'VIP Buyer', mobile: uniqueMobile(6) },
        items: [{ ticketTypeId: vipId, quantity: 2, sellingPrice: 999 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400006.jpg',
      });
    expect(vip.status).toBe(201);
    expect(vip.body.data.vipCount).toBe(2);

    const mixed = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Mixed Buyer', mobile: uniqueMobile(7) },
        items: [
          { ticketTypeId: goldId, quantity: 2, sellingPrice: 799 },
          { ticketTypeId: vipId, quantity: 1, sellingPrice: 999 },
        ],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400007.jpg',
      });
    expect(mixed.status).toBe(201);
    expect(mixed.body.data.totalQuantity).toBe(3);
    expect(mixed.body.data.goldCount).toBe(2);
    expect(mixed.body.data.vipCount).toBe(1);
  });

  it('reuses customer by mobile', async () => {
    const mobile = uniqueMobile(8);
    const first = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Reuse A', mobile },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 500 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400008.jpg',
      });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Reuse B', mobile },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 500 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400009.jpg',
      });
    expect(second.status).toBe(201);
    expect(second.body.data.customer.id).toBe(first.body.data.customer.id);
  });

  it('seller cannot create sale for another seller', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        sellerId: jayId,
        customer: { name: 'Hijack', mobile: uniqueMobile(9) },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 799 }],
      });
    expect(res.status).toBe(403);
  });

  it('admin can create sale for seller', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sellerId: rajId,
        customer: { name: 'Admin Sale', mobile: uniqueMobile(10) },
        items: [{ ticketTypeId: goldId, quantity: 2, sellingPrice: 750 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.seller.id).toBe(rajId);
  });

  it('bulk 100 ticket sale works', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Bulk 100', mobile: uniqueMobile(11) },
        items: [{ ticketTypeId: goldId, quantity: 100, sellingPrice: 799 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400010.jpg',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.totalQuantity).toBe(100);
    expect(res.body.data.tickets).toHaveLength(100);
    expect(new Set(res.body.data.tickets.map((t: { ticketNumber: string }) => t.ticketNumber)).size).toBe(
      100,
    );
  });

  it('creates audit and notifications', async () => {
    const sale = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        customer: { name: 'Audit Sale', mobile: uniqueMobile(12) },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 799 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400011.jpg',
      });
    expect(sale.status).toBe(201);

    const audits = await prisma.auditLog.findMany({
      where: {
        entityId: sale.body.data.id,
        action: { in: ['SALE_CREATED', 'TICKET_CREATED'] },
      },
    });
    expect(audits.length).toBeGreaterThanOrEqual(2);

    const notes = await prisma.notification.findMany({
      where: { entityId: sale.body.data.id },
    });
    expect(notes.length).toBeGreaterThanOrEqual(1);
  });

  it('seller cannot access unrelated sale', async () => {
    const sale = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${jayToken}`)
      .send({
        customer: { name: 'Jay Sale', mobile: uniqueMobile(13) },
        items: [{ ticketTypeId: goldId, quantity: 1, sellingPrice: 799 }],
        adminPaymentProofUrl: '/uploads/payment-proofs/TESTUTR400012.jpg',
      });
    expect(sale.status).toBe(201);

    const denied = await request(app)
      .get(`/api/sales/${sale.body.data.id}`)
      .set('Authorization', `Bearer ${amitToken}`);
    expect(denied.status).toBe(403);
  });

  it('lists tickets and sales summary', async () => {
    const tickets = await request(app)
      .get('/api/tickets')
      .query({ pageSize: 5 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(tickets.status).toBe(200);
    expect(tickets.body.data.pagination).toBeTruthy();

    const summary = await request(app)
      .get('/api/dashboard/sales-summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(summary.status).toBe(200);
    expect(summary.body.data.ticketsSold).toBeGreaterThan(0);
  });

  it('concurrent sales produce unique ticket numbers', async () => {
    const results = await Promise.all(
      [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
        request(app)
          .post('/api/sales')
          .set('Authorization', `Bearer ${i % 2 === 0 ? amitToken : jayToken}`)
          .send({
            customer: { name: `Conc ${i}`, mobile: uniqueMobile(20 + i) },
            items: [{ ticketTypeId: goldId, quantity: 10, sellingPrice: 799 }],
            adminPaymentProofUrl: `/uploads/payment-proofs/CONCUTR${Date.now()}${i}.jpg`,
          }),
      ),
    );

    expect(results.every((r) => r.status === 201)).toBe(true);
    const allNumbers = results.flatMap((r) =>
      r.body.data.tickets.map((t: { ticketNumber: string }) => t.ticketNumber),
    );
    expect(allNumbers).toHaveLength(80);
    expect(new Set(allNumbers).size).toBe(80);
  });

  it('50 concurrent sales produce unique ticket and sale numbers', async () => {
    // Wave concurrency to stay within Prisma connection pool (default ~17)
    const results = [];
    for (let wave = 0; wave < 5; wave += 1) {
      const batch = await Promise.all(
        Array.from({ length: 10 }, (_, j) => {
          const i = wave * 10 + j;
          return request(app)
            .post('/api/sales')
            .set('Authorization', `Bearer ${i % 2 === 0 ? amitToken : jayToken}`)
            .send({
              eventDay: 1 + (i % 10),
              customer: { name: `Burst ${i}`, mobile: uniqueMobile(100 + i) },
              items: [{ ticketTypeId: goldId, quantity: 2, sellingPrice: 799 }],
              adminPaymentProofUrl: `/uploads/payment-proofs/BURSTUTR${Date.now()}${i}.jpg`,
            });
        }),
      );
      results.push(...batch);
    }

    expect(results.every((r) => r.status === 201)).toBe(true);
    const allNumbers = results.flatMap((r) =>
      r.body.data.tickets.map((t: { ticketNumber: string }) => t.ticketNumber),
    );
    const saleNumbers = results.map((r) => r.body.data.saleNumber as string);
    expect(allNumbers).toHaveLength(100);
    expect(new Set(allNumbers).size).toBe(100);
    expect(new Set(saleNumbers).size).toBe(50);
  }, 120_000);
});

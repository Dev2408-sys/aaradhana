import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

const app = createApp();

function uniqueMobile(suffix: number) {
  return `9${String(Date.now()).slice(-8)}${suffix}`.slice(0, 10);
}

async function login(mobile: string, password = 'Kesariya@123') {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ mobile, password });
  expect(res.status).toBe(200);
  return res.body.data as {
    accessToken: string;
    user: { id: string; role: string; sellerProfile: { id: string } | null };
  };
}

describe('Phase 4 — Seller management', () => {
  let adminToken: string;
  let rajId: string;
  let amitId: string;
  let karanId: string;
  let rajToken: string;
  let amitToken: string;

  beforeAll(async () => {
    await prisma.$connect();
    const admin = await login('8888888888');
    adminToken = admin.accessToken;

    const raj = await prisma.sellerProfile.findUniqueOrThrow({
      where: { sellerCode: 'KSR001' },
    });
    const amit = await prisma.sellerProfile.findUniqueOrThrow({
      where: { sellerCode: 'KSR002' },
    });
    const karan = await prisma.sellerProfile.findUniqueOrThrow({
      where: { sellerCode: 'KSR004' },
    });
    rajId = raj.id;
    amitId = amit.id;
    karanId = karan.id;

    rajToken = (await login('7777777777')).accessToken;
    amitToken = (await login('6666666666')).accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('admin creates Master Seller with unique seller code', async () => {
    const mobile = uniqueMobile(1);
    const res = await request(app)
      .post('/api/sellers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Master',
        mobile,
        email: `master.${mobile}@test.local`,
        role: 'MASTER_SELLER',
        parentSellerId: null,
        city: 'Surat',
        expectedSales: 80,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.seller.sellerCode).toMatch(/^KSR\d+$/);
    expect(res.body.data.temporaryPassword).toBeTruthy();
    expect(res.body.data.seller.level).toBe(0);
  });

  it('admin creates Seller under parent', async () => {
    const mobile = uniqueMobile(2);
    const res = await request(app)
      .post('/api/sellers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Child Seller',
        mobile,
        role: 'SELLER',
        parentSellerId: rajId,
        city: 'Surat',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.seller.parentSellerId).toBe(rajId);
    expect(res.body.data.seller.level).toBe(1);
    expect(res.body.data.seller.sellerCode).toMatch(/^KSR\d+$/);
  });

  it('rejects duplicate mobile', async () => {
    const res = await request(app)
      .post('/api/sellers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dup',
        mobile: '7777777777',
        role: 'SELLER',
        parentSellerId: rajId,
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MOBILE_EXISTS');
  });

  it('resolves referral code', async () => {
    const res = await request(app).get('/api/sellers/referral/KSR001');
    expect(res.status).toBe(200);
    expect(res.body.data.sellerCode).toBe('KSR001');
    expect(res.body.data.canAcceptReferrals).toBe(true);
  });

  it('public registration assigns parent from referral code', async () => {
    const mobile = uniqueMobile(3);
    const res = await request(app).post('/api/sellers/register').send({
      referralCode: 'KSR001',
      name: 'Referral Join',
      mobile,
      city: 'Surat',
      area: 'Vesu',
      expectedSales: 15,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.seller.parentSellerId).toBe(rajId);
    expect(res.body.data.seller.activationStatus).toBe('PENDING');
    expect(res.body.data.seller.sellerCode).toMatch(/^KSR\d+$/);
    expect(res.body.data.temporaryPassword).toBeTruthy();
    expect(res.body.data.passwordSetByUser).toBe(false);
  });

  it('public registration accepts user-chosen password', async () => {
    const mobile = uniqueMobile(31);
    const res = await request(app).post('/api/sellers/register').send({
      referralCode: 'KSR001',
      name: 'Pwd Join',
      mobile,
      city: 'Surat',
      password: 'SellerPass9',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.passwordSetByUser).toBe(true);
    expect(res.body.data.temporaryPassword).toBeNull();
  });

  it('rejects invalid referral', async () => {
    const res = await request(app).post('/api/sellers/register').send({
      referralCode: 'NOPE999',
      name: 'Bad Ref',
      mobile: uniqueMobile(4),
    });
    expect(res.status).toBe(404);
  });

  it('inactive parent cannot receive referrals', async () => {
    await prisma.sellerProfile.update({
      where: { id: karanId },
      data: { activationStatus: 'INACTIVE' },
    });

    const res = await request(app).post('/api/sellers/register').send({
      referralCode: 'KSR004',
      name: 'Should Fail',
      mobile: uniqueMobile(5),
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('REFERRAL_PARENT_INACTIVE');

    await prisma.sellerProfile.update({
      where: { id: karanId },
      data: { activationStatus: 'ACTIVE' },
    });
  });

  it('rejects self as parent', async () => {
    const res = await request(app)
      .patch(`/api/sellers/${rajId}/parent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parentSellerId: rajId });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SELLER_HIERARCHY_CYCLE');
  });

  it('rejects circular hierarchy', async () => {
    // Try to set Raj's parent to Rahul (who is under Amit under Raj)
    const rahul = await prisma.sellerProfile.findUniqueOrThrow({
      where: { sellerCode: 'KSR005' },
    });

    const res = await request(app)
      .patch(`/api/sellers/${rajId}/parent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parentSellerId: rahul.id });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SELLER_HIERARCHY_CYCLE');
  });

  it('accepts valid hierarchy parent change', async () => {
    // Move Karan under Amit temporarily, then restore under Raj
    const move = await request(app)
      .patch(`/api/sellers/${karanId}/parent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parentSellerId: amitId });

    expect(move.status).toBe(200);
    expect(move.body.data.parentSellerId).toBe(amitId);
    expect(move.body.data.level).toBe(2);

    const restore = await request(app)
      .patch(`/api/sellers/${karanId}/parent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parentSellerId: rajId });

    expect(restore.status).toBe(200);
    expect(restore.body.data.parentSellerId).toBe(rajId);
    expect(restore.body.data.level).toBe(1);
  });

  it('seller cannot change own parent', async () => {
    const res = await request(app)
      .patch(`/api/sellers/${amitId}/parent`)
      .set('Authorization', `Bearer ${amitToken}`)
      .send({ parentSellerId: null });

    expect(res.status).toBe(403);
  });

  it('seller cannot change own role via profile patch', async () => {
    const res = await request(app)
      .patch('/api/sellers/me')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({ city: 'Surat', role: 'MASTER_SELLER' } as never);

    expect(res.status).toBe(200);
    const me = await request(app)
      .get('/api/sellers/me')
      .set('Authorization', `Bearer ${amitToken}`);
    expect(me.body.data.role).toBe('SELLER');
  });

  it('seller cannot access unrelated seller', async () => {
    // Rahul is under Amit; Karan is under Raj (sibling branch for Amit)
    const res = await request(app)
      .get(`/api/sellers/${karanId}`)
      .set('Authorization', `Bearer ${amitToken}`);

    expect(res.status).toBe(403);
  });

  it('master seller can view permitted team', async () => {
    const res = await request(app)
      .get(`/api/sellers/${rajId}/team`)
      .set('Authorization', `Bearer ${rajToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.directSellers).toBeGreaterThanOrEqual(3);
    expect(res.body.data.tree.some((t: { sellerCode: string }) => t.sellerCode === 'KSR005')).toBe(
      true,
    );
  });

  it('admin can list sellers with pagination search and filters', async () => {
    const res = await request(app)
      .get('/api/sellers')
      .query({ page: 1, pageSize: 5, search: 'Rahul', status: 'ACTIVE', sortBy: 'createdAt' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.pageSize).toBe(5);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('admin can change seller status', async () => {
    const res = await request(app)
      .patch(`/api/sellers/${karanId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ activationStatus: 'SUSPENDED' });

    expect(res.status).toBe(200);
    expect(res.body.data.activationStatus).toBe('SUSPENDED');

    await request(app)
      .patch(`/api/sellers/${karanId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ activationStatus: 'ACTIVE' });
  });

  it('creates audit logs for seller actions', async () => {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            'SELLER_CREATED',
            'SELLER_REGISTERED',
            'SELLER_PARENT_CHANGED',
            'SELLER_STATUS_CHANGED',
          ],
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    expect(logs.length).toBeGreaterThan(0);
  });

  it('returns referral link', async () => {
    const res = await request(app)
      .get(`/api/sellers/${rajId}/referral-link`)
      .set('Authorization', `Bearer ${rajToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain('/seller/join/KSR001');
  });
});

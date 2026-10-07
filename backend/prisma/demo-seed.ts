/**
 * Idempotent Kesariya Navratri 4.0 DEMO dataset.
 * Reuses createSale / customer & seller payment services.
 * Safe to re-run: skips sales/payments if DemoSeedMeta key exists.
 */
import {
  PrismaClient,
  SellerActivationStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createSale } from '../src/services/sale.service';
import { createCustomerPayment } from '../src/services/customer-payment.service';
import { createSellerPayment } from '../src/services/seller-payment.service';
import { ensureEventDays } from '../src/services/event-day.service';
import type { AuthUser } from '../src/types/auth-user';

const prisma = new PrismaClient();
const PASSWORD = 'Kesariya@123';
const DEMO_KEY = 'kesariya-navratri-4-0-demo-v1';
const DEMO_TAG = 'DEMO';

const DAY_TICKET_TARGETS = [40, 45, 50, 55, 60, 65, 70, 75, 80, 90];
const SELLING_PRICES = [499, 549, 599, 649, 699, 749, 799];

const MASTERS = [
  { code: 'MASTER001', name: 'Rahul Patel', mobile: '7777777777', legacyCode: 'KSR001' },
  { code: 'MASTER002', name: 'Jay Shah Master', mobile: '9111000002' },
  { code: 'MASTER003', name: 'Dhruv Desai', mobile: '9111000003' },
  { code: 'MASTER004', name: 'Meet Joshi', mobile: '9111000004' },
  { code: 'MASTER005', name: 'Yash Thakkar', mobile: '9111000005' },
] as const;

const SELLERS = [
  { code: 'S01', name: 'Aarav Patel', mobile: '9122000001', master: 'MASTER001' },
  { code: 'S02', name: 'Krish Shah', mobile: '9122000002', master: 'MASTER001' },
  { code: 'S03', name: 'Dev Mehta', mobile: '9122000003', master: 'MASTER001' },
  { code: 'S04', name: 'Rudra Desai', mobile: '9122000004', master: 'MASTER001' },
  { code: 'S05', name: 'Harsh Joshi', mobile: '9122000005', master: 'MASTER002' },
  { code: 'S06', name: 'Yash Modi', mobile: '9122000006', master: 'MASTER002' },
  { code: 'S07', name: 'Meet Patel', mobile: '9122000007', master: 'MASTER002' },
  { code: 'S08', name: 'Dhruv Shah', mobile: '9122000008', master: 'MASTER002' },
  { code: 'S09', name: 'Parth Desai', mobile: '9122000009', master: 'MASTER003' },
  { code: 'S10', name: 'Kunal Mehta', mobile: '9122000010', master: 'MASTER003' },
  { code: 'S11', name: 'Vivaan Patel', mobile: '9122000011', master: 'MASTER003' },
  { code: 'S12', name: 'Ayan Shah', mobile: '9122000012', master: 'MASTER003' },
  { code: 'S13', name: 'Darsh Joshi', mobile: '9122000013', master: 'MASTER004' },
  { code: 'S14', name: 'Mihir Desai', mobile: '9122000014', master: 'MASTER004' },
  { code: 'S15', name: 'Rishi Patel', mobile: '9122000015', master: 'MASTER004' },
  { code: 'S16', name: 'Manav Shah', mobile: '9122000016', master: 'MASTER004' },
  { code: 'S17', name: 'Jay Mehta', mobile: '9122000017', master: 'MASTER005' },
  { code: 'S18', name: 'Aryan Desai', mobile: '9122000018', master: 'MASTER005' },
  { code: 'S19', name: 'Om Patel', mobile: '9122000019', master: 'MASTER005' },
  { code: 'S20', name: 'Krish Joshi', mobile: '9122000020', master: 'MASTER005' },
  // Keep Phase 4–7 regression accounts as sellers under MASTER001
  { code: 'KSR002', name: 'Amit Patel', mobile: '6666666666', master: 'MASTER001' },
  { code: 'KSR003', name: 'Jay Shah', mobile: '5555555555', master: 'MASTER001' },
  { code: 'KSR004', name: 'Karan Mehta', mobile: '4444444444', master: 'MASTER001' },
  { code: 'KSR005', name: 'Rahul Desai', mobile: '3333333333', master: 'MASTER001' },
] as const;

const CUSTOMER_FIRST = [
  'Amit', 'Neha', 'Priya', 'Rohan', 'Sneha', 'Kavya', 'Ankit', 'Isha', 'Nikhil', 'Pooja',
  'Sahil', 'Diya', 'Vivek', 'Riya', 'Tushar', 'Nisha', 'Hardik', 'Mansi', 'Chirag', 'Kriti',
];
const CUSTOMER_LAST = [
  'Patel', 'Shah', 'Desai', 'Mehta', 'Joshi', 'Modi', 'Trivedi', 'Parekh', 'Dave', 'Rana',
];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

async function upsertUser(input: {
  name: string;
  mobile: string;
  email: string;
  role: UserRole;
}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  return prisma.user.upsert({
    where: { mobile: input.mobile },
    update: {
      name: input.name,
      email: input.email,
      role: input.role,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
    create: {
      name: input.name,
      mobile: input.mobile,
      email: input.email,
      role: input.role,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
  });
}

async function upsertSeller(input: {
  userId: string;
  sellerCode: string;
  parentSellerId?: string | null;
  level: number;
  city?: string;
  area?: string;
}) {
  const byUser = await prisma.sellerProfile.findUnique({ where: { userId: input.userId } });
  if (byUser) {
    return prisma.sellerProfile.update({
      where: { id: byUser.id },
      data: {
        sellerCode: input.sellerCode,
        parentSellerId: input.parentSellerId ?? null,
        level: input.level,
        city: input.city ?? 'Surat',
        area: input.area ?? 'Vesu',
        activationStatus: SellerActivationStatus.ACTIVE,
      },
    });
  }
  return prisma.sellerProfile.upsert({
    where: { sellerCode: input.sellerCode },
    update: {
      userId: input.userId,
      parentSellerId: input.parentSellerId ?? null,
      level: input.level,
      city: input.city ?? 'Surat',
      area: input.area ?? 'Vesu',
      activationStatus: SellerActivationStatus.ACTIVE,
    },
    create: {
      userId: input.userId,
      sellerCode: input.sellerCode,
      parentSellerId: input.parentSellerId ?? null,
      level: input.level,
      city: input.city ?? 'Surat',
      area: input.area ?? 'Vesu',
      expectedSales: 50,
      activationStatus: SellerActivationStatus.ACTIVE,
    },
  });
}

function toAuthUser(user: {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
}, sellerProfileId?: string | null): AuthUser {
  return {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    status: user.status,
    sellerProfileId: sellerProfileId ?? null,
  };
}

export async function runDemoSeed() {
  console.log('--- Demo seed: accounts + event days ---');

  const superAdmin = await upsertUser({
    name: 'Kesariya Super Admin',
    mobile: '9999999999',
    email: 'superadmin@kesariya.demo',
    role: UserRole.SUPER_ADMIN,
  });

  const admin = await upsertUser({
    name: 'Kesariya Event Admin',
    mobile: '8888888888',
    email: 'admin@kesariya.demo',
    role: UserRole.ADMIN,
  });

  const event = await prisma.event.upsert({
    where: { slug: 'kesariya-navratri-4-0' },
    update: {
      name: 'Kesariya Navratri 4.0',
      startDate: new Date('2026-10-11T00:00:00.000Z'),
      endDate: new Date('2026-10-20T23:59:59.000Z'),
      venue: 'Kesariya AC Dome',
      address:
        'Opposite Bhagwan Mahavir College, VIP Road, Vesu, Surat, Gujarat',
      gateOpening: '7:00 PM',
      showStart: '8:00 PM / 8:30 PM',
      timezone: 'Asia/Kolkata',
      dailyTarget: 1100,
      status: 'ACTIVE',
    },
    create: {
      name: 'Kesariya Navratri 4.0',
      slug: 'kesariya-navratri-4-0',
      startDate: new Date('2026-10-11T00:00:00.000Z'),
      endDate: new Date('2026-10-20T23:59:59.000Z'),
      venue: 'Kesariya AC Dome',
      address:
        'Opposite Bhagwan Mahavir College, VIP Road, Vesu, Surat, Gujarat',
      gateOpening: '7:00 PM',
      showStart: '8:00 PM / 8:30 PM',
      timezone: 'Asia/Kolkata',
      dailyTarget: 1100,
      status: 'ACTIVE',
    },
  });

  const gold = await prisma.ticketType.upsert({
    where: { eventId_code: { eventId: event.id, code: 'GOLD' } },
    update: { name: 'Gold', numberPrefix: 'G', basePrice: 400, minimumPrice: 400, active: true },
    create: {
      eventId: event.id,
      name: 'Gold',
      code: 'GOLD',
      numberPrefix: 'G',
      basePrice: 400,
      minimumPrice: 400,
      active: true,
    },
  });

  const vip = await prisma.ticketType.upsert({
    where: { eventId_code: { eventId: event.id, code: 'VIP' } },
    update: { name: 'VIP', numberPrefix: 'V', basePrice: 400, minimumPrice: 400, active: true },
    create: {
      eventId: event.id,
      name: 'VIP',
      code: 'VIP',
      numberPrefix: 'V',
      basePrice: 400,
      minimumPrice: 400,
      active: true,
    },
  });

  for (const tt of [gold, vip]) {
    await prisma.ticketSequence.upsert({
      where: { eventId_ticketTypeId: { eventId: event.id, ticketTypeId: tt.id } },
      update: {},
      create: { eventId: event.id, ticketTypeId: tt.id, currentNumber: 0 },
    });
  }

  await ensureEventDays(event.id);

  // Masters (MASTER001 keeps sellerCode KSR001 for backward-compatible tests)
  const masterMap = new Map<string, string>(); // code -> sellerProfileId
  for (const m of MASTERS) {
    const user = await upsertUser({
      name: m.name,
      mobile: m.mobile,
      email: `${m.code.toLowerCase()}@kesariya.demo`,
      role: UserRole.MASTER_SELLER,
    });
    const sellerCode = m.code === 'MASTER001' ? 'KSR001' : m.code;
    const profile = await upsertSeller({
      userId: user.id,
      sellerCode,
      parentSellerId: null,
      level: 0,
      area: 'Vesu',
    });
    masterMap.set(m.code, profile.id);
  }

  // Sellers
  const sellerProfiles: Array<{ code: string; id: string; mobile: string; name: string }> = [];
  for (const s of SELLERS) {
    const user = await upsertUser({
      name: s.name,
      mobile: s.mobile,
      email: `${s.code.toLowerCase()}@kesariya.demo`,
      role: UserRole.SELLER,
    });
    const parentId = masterMap.get(s.master)!;
    const profile = await upsertSeller({
      userId: user.id,
      sellerCode: s.code,
      parentSellerId: parentId,
      level: 1,
      area: 'Surat',
    });
    sellerProfiles.push({ code: s.code, id: profile.id, mobile: s.mobile, name: s.name });
  }

  const existingMeta = await prisma.demoSeedMeta.findUnique({ where: { key: DEMO_KEY } });
  if (existingMeta && process.env.DEMO_FORCE !== '1') {
    console.log(`Demo sales already seeded (${DEMO_KEY}). Skipping sales/payments.`);
    console.log('Set DEMO_FORCE=1 to re-run transactional demo sales (creates more data).');
    return {
      skippedSales: true,
      masters: MASTERS.length,
      sellers: SELLERS.length,
      eventDays: 10,
    };
  }

  console.log('--- Demo seed: customers + sales + payments ---');
  const adminActor = toAuthUser(admin);

  // 100 demo customers
  const customers: Array<{ name: string; mobile: string }> = [];
  for (let i = 0; i < 100; i++) {
    const mobile = `9133${String(100000 + i).slice(-6)}`;
    const name = `${pick(CUSTOMER_FIRST, i)} ${pick(CUSTOMER_LAST, i + 3)}`;
    await prisma.customer.upsert({
      where: { mobile },
      update: { name, city: 'Surat', notes: `[${DEMO_TAG}] seeded customer` },
      create: {
        name,
        mobile,
        email: `demo.customer.${i + 1}@kesariya.demo`,
        city: 'Surat',
        notes: `[${DEMO_TAG}] seeded customer`,
      },
    });
    customers.push({ name, mobile });
  }

  let saleCount = 0;
  let ticketCount = 0;
  let goldCount = 0;
  let vipCount = 0;
  let customerPaymentCount = 0;
  let sellerPaymentCount = 0;
  let saleCursor = 0;

  // Uneven seller weights (top / mid / low)
  const weights = sellerProfiles.map((_, i) => {
    if (i < 5) return 5;
    if (i < 14) return 3;
    return 1;
  });
  const weightSum = weights.reduce((a, b) => a + b, 0);

  function pickSeller(n: number) {
    let r = n % weightSum;
    for (let i = 0; i < sellerProfiles.length; i++) {
      r -= weights[i]!;
      if (r < 0) return sellerProfiles[i]!;
    }
    return sellerProfiles[0]!;
  }

  for (let day = 1; day <= 10; day++) {
    let remaining = DAY_TICKET_TARGETS[day - 1]!;
    let guard = 0;
    while (remaining > 0 && guard < 200) {
      guard += 1;
      const seller = pickSeller(saleCursor + day * 17);
      const qty = Math.min(remaining, 1 + ((saleCursor + day) % 4)); // 1–4 tickets
      const isVip = (saleCursor + day) % 5 === 0;
      const ticketTypeId = isVip ? vip.id : gold.id;
      const sellingPrice = pick(SELLING_PRICES, saleCursor + day);
      const customer = customers[(saleCursor + day * 3) % customers.length]!;

      const sale = await createSale(adminActor, {
        sellerId: seller.id,
        eventDay: day,
        dataSource: DEMO_TAG,
        customer: {
          name: customer.name,
          mobile: customer.mobile,
          email: null,
          city: 'Surat',
        },
        items: [{ ticketTypeId, quantity: qty, sellingPrice }],
        customerPaymentStatus: 'PENDING',
      });

      // Align soldAt to event evening (IST ~ 19:30 → store as UTC approx)
      const soldAt = new Date(Date.UTC(2026, 9, 10 + day, 14, 0, saleCursor % 50));
      await prisma.sale.update({
        where: { id: sale.id },
        data: { soldAt, dataSource: DEMO_TAG },
      });
      await prisma.ticket.updateMany({
        where: { saleId: sale.id },
        data: { soldAt, issuedAt: soldAt },
      });

      saleCount += 1;
      ticketCount += qty;
      if (isVip) vipCount += qty;
      else goldCount += qty;
      remaining -= qty;
      saleCursor += 1;

      // Customer payment distribution ~35% paid, 40% partial, 25% unpaid
      const bucket = saleCursor % 20;
      if (bucket < 7) {
        // full paid
        await createCustomerPayment(adminActor, {
          saleId: sale.id,
          amount: sale.totalAmount,
          paymentMethod: pick(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD'] as const, saleCursor),
          paymentReference: `DEMO-FULL-${sale.saleNumber}`,
          notes: `[${DEMO_TAG}] full payment`,
          idempotencyKey: `DEMO-CP-FULL-${sale.id}`,
        });
        customerPaymentCount += 1;
      } else if (bucket < 15) {
        const partial = Math.min(
          sale.totalAmount - 1,
          pick([200, 300, 400, 500], saleCursor),
        );
        if (partial > 0 && partial < sale.totalAmount) {
          await createCustomerPayment(adminActor, {
            saleId: sale.id,
            amount: partial,
            paymentMethod: pick(['CASH', 'UPI'] as const, saleCursor),
            paymentReference: `DEMO-PART-${sale.saleNumber}`,
            notes: `[${DEMO_TAG}] partial payment`,
            idempotencyKey: `DEMO-CP-PART-${sale.id}`,
          });
          customerPaymentCount += 1;
        }
      }
    }
  }

  // Seller settlements: uneven
  for (let i = 0; i < sellerProfiles.length; i++) {
    const seller = sellerProfiles[i]!;
    const agg = await prisma.sale.aggregate({
      where: { sellerId: seller.id, dataSource: DEMO_TAG, saleStatus: 'CONFIRMED' },
      _sum: { baseAmount: true },
    });
    const receivable = Number(agg._sum.baseAmount ?? 0);
    if (receivable <= 0) continue;

    let payRatio = 0;
    if (i % 3 === 0) payRatio = 1;
    else if (i % 3 === 1) payRatio = 0.55;
    else payRatio = 0;

    const amount = Math.round(receivable * payRatio);
    if (amount >= 100) {
      await createSellerPayment(adminActor, {
        sellerId: seller.id,
        amount,
        paymentMethod: 'UPI',
        paymentReference: `DEMO-SETTLE-${seller.code}`,
        notes: `[${DEMO_TAG}] settlement`,
        idempotencyKey: `DEMO-SP-${seller.id}`,
      });
      sellerPaymentCount += 1;
    }
  }

  // Light notifications for admins/sellers
  const sampleSellers = sellerProfiles.slice(0, 5);
  for (const s of sampleSellers) {
    const user = await prisma.user.findFirst({
      where: { sellerProfile: { id: s.id } },
    });
    if (!user) continue;
    await prisma.notification.create({
      data: {
        recipientUserId: user.id,
        type: 'DAILY_TARGET',
        title: 'Day 5 sales target update',
        message: `[${DEMO_TAG}] Your Day 5 target progress was updated.`,
        entityType: 'event',
        entityId: event.id,
      },
    });
  }
  await prisma.notification.create({
    data: {
      recipientUserId: admin.id,
      type: 'SYSTEM_ALERT',
      title: 'Demo dataset ready',
      message: `[${DEMO_TAG}] Navratri Day 1–10 demo sales and payments loaded.`,
      entityType: 'system',
      entityId: DEMO_KEY,
    },
  });

  const stats = {
    eventDays: 10,
    masters: MASTERS.length,
    sellers: SELLERS.length,
    customers: 100,
    sales: saleCount,
    tickets: ticketCount,
    gold: goldCount,
    vip: vipCount,
    customerPayments: customerPaymentCount,
    sellerPayments: sellerPaymentCount,
  };

  await prisma.demoSeedMeta.upsert({
    where: { key: DEMO_KEY },
    update: { stats, seededAt: new Date() },
    create: { key: DEMO_KEY, stats },
  });

  console.log('Demo seed stats:', stats);
  console.log(`SUPER_ADMIN ${superAdmin.mobile} / ADMIN ${admin.mobile} / password ${PASSWORD}`);
  return stats;
}


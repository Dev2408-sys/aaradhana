/**
 * Production live accounts seeder (idempotent).
 * Creates admin + sellers, event foundation (days / zones). Safe to re-run.
 *
 * Run on VPS:
 *   cd /var/www/aaradhana/backend && npm run seed:live
 */
import {
  PrismaClient,
  SellerActivationStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { hashPassword } from '../src/utils/password';
import { ensureEventDays } from '../src/services/event-day.service';

const prisma = new PrismaClient();

const PASSWORD = 'Heric@1211';

const ADMIN = {
  name: 'Aaradhana Admin',
  mobile: '6355962752',
  role: UserRole.ADMIN as const,
};

const SELLERS = [
  {
    name: 'Dev Vadadoriya',
    mobile: '7211132000',
    sellerCode: 'DEV001',
  },
  {
    name: 'Hiren Khunt',
    mobile: '9512380711',
    sellerCode: 'HIR001',
  },
] as const;

async function ensureEventFoundation() {
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
    update: {
      name: 'Gold',
      numberPrefix: 'G',
      basePrice: 400,
      minimumPrice: 400,
      active: true,
    },
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
    update: {
      name: 'VIP',
      numberPrefix: 'V',
      basePrice: 400,
      minimumPrice: 400,
      active: true,
    },
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
      where: {
        eventId_ticketTypeId: { eventId: event.id, ticketTypeId: tt.id },
      },
      update: {},
      create: {
        eventId: event.id,
        ticketTypeId: tt.id,
        currentNumber: 0,
      },
    });
  }

  await ensureEventDays(event.id);
  return event;
}

async function upsertUser(input: {
  name: string;
  mobile: string;
  role: UserRole;
}) {
  const passwordHash = await hashPassword(PASSWORD);
  return prisma.user.upsert({
    where: { mobile: input.mobile },
    update: {
      name: input.name,
      role: input.role,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
    create: {
      name: input.name,
      mobile: input.mobile,
      email: null,
      role: input.role,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
  });
}

async function upsertSellerProfile(input: {
  userId: string;
  sellerCode: string;
}) {
  const byUser = await prisma.sellerProfile.findUnique({
    where: { userId: input.userId },
  });

  if (byUser) {
    return prisma.sellerProfile.update({
      where: { id: byUser.id },
      data: {
        sellerCode: input.sellerCode,
        parentSellerId: null,
        level: 0,
        activationStatus: SellerActivationStatus.ACTIVE,
      },
    });
  }

  return prisma.sellerProfile.upsert({
    where: { sellerCode: input.sellerCode },
    update: {
      userId: input.userId,
      parentSellerId: null,
      level: 0,
      activationStatus: SellerActivationStatus.ACTIVE,
    },
    create: {
      userId: input.userId,
      sellerCode: input.sellerCode,
      parentSellerId: null,
      level: 0,
      activationStatus: SellerActivationStatus.ACTIVE,
    },
  });
}

export async function runLiveSeed() {
  console.log('--- Live seed: event foundation ---');
  const event = await ensureEventFoundation();
  console.log(`Event ready: ${event.name} (${event.slug})`);

  console.log('--- Live seed: admin ---');
  const admin = await upsertUser(ADMIN);
  console.log(`ADMIN  ${admin.mobile}  (${admin.name})`);

  console.log('--- Live seed: sellers ---');
  for (const s of SELLERS) {
    const user = await upsertUser({
      name: s.name,
      mobile: s.mobile,
      role: UserRole.SELLER,
    });
    const profile = await upsertSellerProfile({
      userId: user.id,
      sellerCode: s.sellerCode,
    });
    console.log(
      `SELLER ${user.mobile}  (${user.name})  code=${profile.sellerCode}`,
    );
  }

  console.log('');
  console.log('Login password for all accounts:', PASSWORD);
  console.log('Done. Open https://aaradhana.khodi.in and sign in.');
}

async function main() {
  await runLiveSeed();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

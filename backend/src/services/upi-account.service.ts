import { Prisma, UpiAccountStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import {
  ForbiddenError,
  NotFoundError,
  ValidationAppError,
} from '../utils/errors';
import { endOfIstDay, formatIstDate, parseIstDate, startOfIstDay } from '../utils/ist-day';
import { createAuditLog } from './audit.service';

const UPI_ID_RE = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;

function isAdmin(user: AuthUser) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

type Tx = Prisma.TransactionClient | typeof prisma;

export async function ensurePaymentSettings(eventId: string) {
  return prisma.paymentSettings.upsert({
    where: { eventId },
    update: {},
    create: {
      eventId,
      upiInstructions:
        'Scan QR or pay via UPI, then upload payment screenshot with the sale.',
      supportWhatsapp: '919998887766',
      requireUtrForUpi: false,
      defaultRotateLimitAmount: 100000,
    },
  });
}

/** Sync legacy PaymentSettings single-UPI fields from the receiving account. */
export async function syncLegacyPaymentSettings(eventId: string, tx: Tx = prisma) {
  const receiving = await tx.upiAccount.findFirst({
    where: { eventId, isReceiving: true, status: UpiAccountStatus.ACTIVE },
    orderBy: { sortOrder: 'asc' },
  });
  const settings = await tx.paymentSettings.findUnique({ where: { eventId } });
  if (!settings) return;

  await tx.paymentSettings.update({
    where: { id: settings.id },
    data: {
      upiId: receiving?.upiId ?? null,
      upiPayeeName: receiving?.payeeName ?? null,
      upiQrImageUrl: receiving?.qrImageUrl ?? null,
      upiInstructions:
        receiving?.instructions ?? settings.upiInstructions,
    },
  });
}

export async function getReceivingUpiAccount(eventId: string, tx: Tx = prisma) {
  let receiving = await tx.upiAccount.findFirst({
    where: { eventId, isReceiving: true, status: UpiAccountStatus.ACTIVE },
    orderBy: { sortOrder: 'asc' },
  });
  if (receiving) return receiving;

  const main = await tx.upiAccount.findFirst({
    where: { eventId, isMain: true, status: UpiAccountStatus.ACTIVE },
    orderBy: { sortOrder: 'asc' },
  });
  if (main) {
    await tx.upiAccount.updateMany({
      where: { eventId, isReceiving: true },
      data: { isReceiving: false },
    });
    receiving = await tx.upiAccount.update({
      where: { id: main.id },
      data: { isReceiving: true },
    });
    await syncLegacyPaymentSettings(eventId, tx);
    return receiving;
  }

  const any = await tx.upiAccount.findFirst({
    where: { eventId, status: UpiAccountStatus.ACTIVE },
    orderBy: { sortOrder: 'asc' },
  });
  if (!any) return null;

  await tx.upiAccount.updateMany({
    where: { eventId, isReceiving: true },
    data: { isReceiving: false },
  });
  receiving = await tx.upiAccount.update({
    where: { id: any.id },
    data: { isReceiving: true, isMain: true },
  });
  await syncLegacyPaymentSettings(eventId, tx);
  return receiving;
}

export function istDayBounds(date?: string | Date | null) {
  const day =
    typeof date === 'string' || date == null
      ? parseIstDate(date)
      : startOfIstDay(date);
  return {
    day,
    gte: day,
    lt: endOfIstDay(day),
    dateKey: formatIstDate(day),
  };
}

export async function approvedBaseTotalForAccount(
  upiAccountId: string,
  date?: string | Date | null,
  tx: Tx = prisma,
) {
  const { gte, lt } = istDayBounds(date);
  const agg = await tx.sale.aggregate({
    where: {
      upiAccountId,
      approvedAt: { gte, lt },
      saleStatus: { not: 'CANCELLED' },
    },
    _sum: { baseAmount: true },
    _count: { _all: true },
  });
  return {
    approvedCount: agg._count._all,
    receivedBase: Number(agg._sum.baseAmount ?? 0),
  };
}

export async function listAccountDayStats(eventId: string, date?: string | null) {
  const { gte, lt, dateKey } = istDayBounds(date);
  const accounts = await prisma.upiAccount.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  const rows = await Promise.all(
    accounts.map(async (a) => {
      const agg = await prisma.sale.aggregate({
        where: {
          upiAccountId: a.id,
          approvedAt: { gte, lt },
          saleStatus: { not: 'CANCELLED' },
        },
        _sum: { baseAmount: true },
        _count: { _all: true },
      });
      const receivedBase = Number(agg._sum.baseAmount ?? 0);
      const limit = Number(a.rotateLimitAmount);
      return {
        id: a.id,
        label: a.label,
        upiId: a.upiId,
        payeeName: a.payeeName,
        qrImageUrl: a.qrImageUrl,
        instructions: a.instructions,
        status: a.status,
        isMain: a.isMain,
        isReceiving: a.isReceiving,
        rotateLimitAmount: limit,
        sortOrder: a.sortOrder,
        approvedCount: agg._count._all,
        receivedBase,
        remainingToLimit: Math.max(0, limit - receivedBase),
      };
    }),
  );

  return { date: dateKey, accounts: rows };
}

export function mapUpiAccount(
  a: {
    id: string;
    label: string;
    upiId: string;
    payeeName: string;
    qrImageUrl: string | null;
    instructions: string | null;
    status: UpiAccountStatus;
    isMain: boolean;
    isReceiving: boolean;
    rotateLimitAmount: Prisma.Decimal | number;
    sortOrder: number;
  },
  stats?: { approvedCount: number; receivedBase: number },
) {
  const limit = Number(a.rotateLimitAmount);
  const receivedBase = stats?.receivedBase ?? 0;
  return {
    id: a.id,
    label: a.label,
    upiId: a.upiId,
    payeeName: a.payeeName,
    qrImageUrl: a.qrImageUrl,
    instructions: a.instructions,
    status: a.status,
    isMain: a.isMain,
    isReceiving: a.isReceiving,
    rotateLimitAmount: limit,
    sortOrder: a.sortOrder,
    approvedCount: stats?.approvedCount ?? 0,
    receivedBase,
    remainingToLimit: Math.max(0, limit - receivedBase),
  };
}

async function clearReceiving(eventId: string, tx: Tx) {
  await tx.upiAccount.updateMany({
    where: { eventId, isReceiving: true },
    data: { isReceiving: false },
  });
}

async function clearMain(eventId: string, tx: Tx) {
  await tx.upiAccount.updateMany({
    where: { eventId, isMain: true },
    data: { isMain: false },
  });
}

export async function createUpiAccount(
  actor: AuthUser,
  input: {
    eventId?: string;
    label: string;
    upiId: string;
    payeeName: string;
    qrImageUrl?: string | null;
    instructions?: string | null;
    rotateLimitAmount?: number | null;
    setAsMain?: boolean;
  },
  ipAddress?: string,
) {
  if (!isAdmin(actor)) throw new ForbiddenError('Only admin can manage UPI accounts');

  const upiId = input.upiId.trim();
  if (!UPI_ID_RE.test(upiId)) {
    throw new ValidationAppError('Enter a valid UPI ID (example: name@upi)');
  }
  const label = input.label.trim();
  const payeeName = input.payeeName.trim();
  if (!label || !payeeName) {
    throw new ValidationAppError('Label and payee name are required');
  }

  const event = input.eventId
    ? await prisma.event.findUnique({ where: { id: input.eventId } })
    : await prisma.event.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'asc' },
      });
  if (!event) throw new NotFoundError('Active event not found');

  const settings = await ensurePaymentSettings(event.id);
  const defaultLimit = Number(settings.defaultRotateLimitAmount);
  const limit =
    input.rotateLimitAmount != null && Number.isFinite(input.rotateLimitAmount)
      ? Number(input.rotateLimitAmount)
      : defaultLimit;
  if (limit <= 0) throw new ValidationAppError('Rotate limit must be positive');

  const count = await prisma.upiAccount.count({ where: { eventId: event.id } });
  const makeMain = input.setAsMain === true || count === 0;

  const account = await prisma.$transaction(async (tx) => {
    if (makeMain) {
      await clearMain(event.id, tx);
      await clearReceiving(event.id, tx);
    }

    const created = await tx.upiAccount.create({
      data: {
        eventId: event.id,
        label,
        upiId,
        payeeName,
        qrImageUrl: input.qrImageUrl?.trim() || null,
        instructions: input.instructions?.trim() || null,
        status: UpiAccountStatus.ACTIVE,
        isMain: makeMain,
        isReceiving: makeMain,
        rotateLimitAmount: limit,
        sortOrder: count,
      },
    });

    await syncLegacyPaymentSettings(event.id, tx);
    return created;
  });

  await createAuditLog({
    userId: actor.id,
    action: 'UPI_ACCOUNT_CREATED',
    entityType: 'upi_account',
    entityId: account.id,
    newValue: { upiId: account.upiId, label: account.label, isMain: account.isMain },
    ipAddress,
  });

  const stats = await approvedBaseTotalForAccount(account.id);
  return mapUpiAccount(account, stats);
}

export async function updateUpiAccount(
  actor: AuthUser,
  accountId: string,
  input: {
    label?: string;
    upiId?: string;
    payeeName?: string;
    qrImageUrl?: string | null;
    instructions?: string | null;
    rotateLimitAmount?: number | null;
    status?: 'ACTIVE' | 'INACTIVE';
  },
  ipAddress?: string,
) {
  if (!isAdmin(actor)) throw new ForbiddenError('Only admin can manage UPI accounts');

  const existing = await prisma.upiAccount.findUnique({ where: { id: accountId } });
  if (!existing) throw new NotFoundError('UPI account not found');

  if (input.upiId != null && !UPI_ID_RE.test(input.upiId.trim())) {
    throw new ValidationAppError('Enter a valid UPI ID (example: name@upi)');
  }
  if (input.rotateLimitAmount != null && input.rotateLimitAmount <= 0) {
    throw new ValidationAppError('Rotate limit must be positive');
  }

  const account = await prisma.$transaction(async (tx) => {
    if (input.status === 'INACTIVE' && existing.isReceiving) {
      const next = await tx.upiAccount.findFirst({
        where: {
          eventId: existing.eventId,
          status: UpiAccountStatus.ACTIVE,
          id: { not: existing.id },
        },
        orderBy: { sortOrder: 'asc' },
      });
      await tx.upiAccount.update({
        where: { id: existing.id },
        data: { isReceiving: false, isMain: false },
      });
      if (next) {
        await clearReceiving(existing.eventId, tx);
        await tx.upiAccount.update({
          where: { id: next.id },
          data: {
            isReceiving: true,
            ...(existing.isMain ? { isMain: true } : {}),
          },
        });
        if (existing.isMain) {
          await clearMain(existing.eventId, tx);
          await tx.upiAccount.update({
            where: { id: next.id },
            data: { isMain: true },
          });
        }
      }
    }

    const updated = await tx.upiAccount.update({
      where: { id: accountId },
      data: {
        ...(input.label != null ? { label: input.label.trim() } : {}),
        ...(input.upiId != null ? { upiId: input.upiId.trim() } : {}),
        ...(input.payeeName != null ? { payeeName: input.payeeName.trim() } : {}),
        ...(input.qrImageUrl !== undefined
          ? { qrImageUrl: input.qrImageUrl?.trim() || null }
          : {}),
        ...(input.instructions !== undefined
          ? { instructions: input.instructions?.trim() || null }
          : {}),
        ...(input.rotateLimitAmount != null
          ? { rotateLimitAmount: input.rotateLimitAmount }
          : {}),
        ...(input.status != null ? { status: input.status } : {}),
      },
    });

    await syncLegacyPaymentSettings(existing.eventId, tx);
    return updated;
  });

  await createAuditLog({
    userId: actor.id,
    action: 'UPI_ACCOUNT_UPDATED',
    entityType: 'upi_account',
    entityId: account.id,
    newValue: input,
    ipAddress,
  });

  const stats = await approvedBaseTotalForAccount(account.id);
  return mapUpiAccount(account, stats);
}

export async function setMainUpiAccount(
  actor: AuthUser,
  accountId: string,
  ipAddress?: string,
) {
  if (!isAdmin(actor)) throw new ForbiddenError('Only admin can manage UPI accounts');

  const account = await prisma.upiAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new NotFoundError('UPI account not found');
  if (account.status !== UpiAccountStatus.ACTIVE) {
    throw new ValidationAppError('Only active UPI accounts can be set as main');
  }

  await prisma.$transaction(async (tx) => {
    await clearMain(account.eventId, tx);
    await clearReceiving(account.eventId, tx);
    await tx.upiAccount.update({
      where: { id: accountId },
      data: { isMain: true, isReceiving: true },
    });
    await syncLegacyPaymentSettings(account.eventId, tx);
  });

  await createAuditLog({
    userId: actor.id,
    action: 'UPI_ACCOUNT_SET_MAIN',
    entityType: 'upi_account',
    entityId: accountId,
    ipAddress,
  });

  return listAccountDayStats(account.eventId);
}

export async function setReceivingUpiAccount(
  actor: AuthUser,
  accountId: string,
  ipAddress?: string,
) {
  if (!isAdmin(actor)) throw new ForbiddenError('Only admin can manage UPI accounts');

  const account = await prisma.upiAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new NotFoundError('UPI account not found');
  if (account.status !== UpiAccountStatus.ACTIVE) {
    throw new ValidationAppError('Only active UPI accounts can receive payments');
  }

  await prisma.$transaction(async (tx) => {
    await clearReceiving(account.eventId, tx);
    await tx.upiAccount.update({
      where: { id: accountId },
      data: { isReceiving: true },
    });
    await syncLegacyPaymentSettings(account.eventId, tx);
  });

  await createAuditLog({
    userId: actor.id,
    action: 'UPI_ACCOUNT_SET_RECEIVING',
    entityType: 'upi_account',
    entityId: accountId,
    ipAddress,
  });

  return listAccountDayStats(account.eventId);
}

/**
 * After admin approval: if today's approved base on this account >= limit,
 * rotate receiving to the next ACTIVE account (round-robin by sortOrder).
 */
export async function maybeRotateAfterApproval(
  upiAccountId: string | null | undefined,
  actorUserId: string,
  ipAddress?: string,
  tx: Tx = prisma,
) {
  if (!upiAccountId) return null;

  const account = await tx.upiAccount.findUnique({ where: { id: upiAccountId } });
  if (!account || !account.isReceiving) return null;

  const { receivedBase } = await approvedBaseTotalForAccount(account.id, undefined, tx);
  const limit = Number(account.rotateLimitAmount);
  if (receivedBase < limit) return null;

  const actives = await tx.upiAccount.findMany({
    where: { eventId: account.eventId, status: UpiAccountStatus.ACTIVE },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  if (actives.length < 2) return null;

  const idx = actives.findIndex((a) => a.id === account.id);
  const next = actives[(idx + 1) % actives.length];
  if (!next || next.id === account.id) return null;

  await clearReceiving(account.eventId, tx);
  await tx.upiAccount.update({
    where: { id: next.id },
    data: { isReceiving: true },
  });
  await syncLegacyPaymentSettings(account.eventId, tx);

  await createAuditLog(
    {
      userId: actorUserId,
      action: 'UPI_ROTATED',
      entityType: 'upi_account',
      entityId: next.id,
      oldValue: {
        fromAccountId: account.id,
        fromUpiId: account.upiId,
        receivedBase,
        limit,
      },
      newValue: {
        toAccountId: next.id,
        toUpiId: next.upiId,
      },
      ipAddress,
    },
    tx,
  );

  return next;
}

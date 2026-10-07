import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import { ForbiddenError, NotFoundError, ValidationAppError } from '../utils/errors';
import { createAuditLog } from './audit.service';
import { buildUpiDeepLink, generateUpiQrDataUrl } from '../utils/upi-qr';
import {
  approvedBaseTotalForAccount,
  ensurePaymentSettings,
  getReceivingUpiAccount,
  listAccountDayStats,
  mapUpiAccount,
  syncLegacyPaymentSettings,
} from './upi-account.service';

function isAdmin(user: AuthUser) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

async function activeEvent(eventId?: string) {
  const event = eventId
    ? await prisma.event.findUnique({ where: { id: eventId } })
    : await prisma.event.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'asc' },
      });
  if (!event) throw new NotFoundError('Active event not found');
  return event;
}

async function mapReceivingPayload(
  event: { id: string; name: string },
  actor: AuthUser,
  amount?: number | null,
) {
  await ensurePaymentSettings(event.id);
  const settings = await prisma.paymentSettings.findUniqueOrThrow({
    where: { eventId: event.id },
  });
  const receiving = await getReceivingUpiAccount(event.id);

  const upiId = receiving?.upiId?.trim() || settings.upiId?.trim() || null;
  const upiPayeeName = receiving?.payeeName || settings.upiPayeeName;
  const upiQrImageUrl = receiving?.qrImageUrl || settings.upiQrImageUrl;
  const upiInstructions =
    receiving?.instructions || settings.upiInstructions;

  const deepLink = upiId
    ? buildUpiDeepLink({
        upiId,
        payeeName: upiPayeeName,
        amount: amount ?? null,
        note: 'Kesariya Navratri 4.0',
      })
    : null;

  let qrCodeDataUrl: string | null = null;
  if (deepLink) {
    try {
      qrCodeDataUrl = await generateUpiQrDataUrl(deepLink);
    } catch {
      qrCodeDataUrl = null;
    }
  }

  const receivingStats = receiving
    ? await approvedBaseTotalForAccount(receiving.id)
    : null;

  const dayStats = isAdmin(actor)
    ? await listAccountDayStats(event.id)
    : null;

  return {
    event: { id: event.id, name: event.name },
    upiId,
    upiPayeeName,
    upiInstructions,
    upiQrImageUrl,
    upiDeepLink: deepLink,
    qrCodeDataUrl,
    displayQrUrl: upiQrImageUrl || qrCodeDataUrl,
    supportWhatsapp: settings.supportWhatsapp?.replace(/\D/g, '') || null,
    requireUtrForUpi: false,
    defaultRotateLimitAmount: Number(settings.defaultRotateLimitAmount),
    canEdit: isAdmin(actor),
    receivingAccount: receiving
      ? mapUpiAccount(receiving, receivingStats ?? undefined)
      : null,
    accounts: dayStats?.accounts ?? undefined,
    statsDate: dayStats?.date ?? undefined,
  };
}

export async function getPaymentSettings(
  actor: AuthUser,
  eventId?: string,
  amount?: number | null,
) {
  const event = await activeEvent(eventId);
  return mapReceivingPayload(event, actor, amount);
}

export async function getUpiStats(actor: AuthUser, date?: string, eventId?: string) {
  if (!isAdmin(actor)) throw new ForbiddenError('Only admin can view UPI stats');
  const event = await activeEvent(eventId);
  await ensurePaymentSettings(event.id);
  return listAccountDayStats(event.id, date);
}

/**
 * Legacy single-UPI update — upserts/updates the receiving (or creates) account
 * and shared settings (support WhatsApp, default rotate limit, instructions).
 */
export async function updatePaymentSettings(
  actor: AuthUser,
  input: {
    eventId?: string;
    upiId?: string | null;
    upiPayeeName?: string | null;
    upiInstructions?: string | null;
    upiQrImageUrl?: string | null;
    supportWhatsapp?: string | null;
    requireUtrForUpi?: boolean;
    defaultRotateLimitAmount?: number | null;
  },
  ipAddress?: string,
) {
  if (!isAdmin(actor)) {
    throw new ForbiddenError('Only admin can update payment settings');
  }

  const event = await activeEvent(input.eventId);
  await ensurePaymentSettings(event.id);

  const upiId = input.upiId?.trim() || null;
  if (upiId && !/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
    throw new ValidationAppError('Enter a valid UPI ID (example: name@upi)');
  }

  const supportWhatsapp = input.supportWhatsapp
    ? input.supportWhatsapp.replace(/\D/g, '')
    : null;
  if (supportWhatsapp && (supportWhatsapp.length < 10 || supportWhatsapp.length > 15)) {
    throw new ValidationAppError('Support WhatsApp must be 10–15 digits (with country code)');
  }

  if (
    input.defaultRotateLimitAmount != null &&
    (!Number.isFinite(input.defaultRotateLimitAmount) ||
      input.defaultRotateLimitAmount <= 0)
  ) {
    throw new ValidationAppError('Default rotate limit must be a positive number');
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentSettings.update({
      where: { eventId: event.id },
      data: {
        ...(input.upiInstructions !== undefined
          ? { upiInstructions: input.upiInstructions?.trim() || null }
          : {}),
        ...(input.supportWhatsapp !== undefined ? { supportWhatsapp } : {}),
        ...(input.defaultRotateLimitAmount != null
          ? { defaultRotateLimitAmount: input.defaultRotateLimitAmount }
          : {}),
        requireUtrForUpi: false,
      },
    });

    if (upiId) {
      let receiving = await tx.upiAccount.findFirst({
        where: { eventId: event.id, isReceiving: true },
      });
      if (!receiving) {
        receiving = await tx.upiAccount.findFirst({
          where: { eventId: event.id, status: 'ACTIVE' },
          orderBy: { sortOrder: 'asc' },
        });
      }

      if (receiving) {
        await tx.upiAccount.update({
          where: { id: receiving.id },
          data: {
            upiId,
            payeeName: input.upiPayeeName?.trim() || receiving.payeeName,
            ...(input.upiQrImageUrl !== undefined
              ? { qrImageUrl: input.upiQrImageUrl?.trim() || null }
              : {}),
            ...(input.upiInstructions !== undefined
              ? { instructions: input.upiInstructions?.trim() || null }
              : {}),
            isReceiving: true,
          },
        });
      } else {
        await tx.upiAccount.create({
          data: {
            eventId: event.id,
            label: input.upiPayeeName?.trim() || 'Main UPI',
            upiId,
            payeeName: input.upiPayeeName?.trim() || 'Kesariya Navratri 4.0',
            qrImageUrl: input.upiQrImageUrl?.trim() || null,
            instructions: input.upiInstructions?.trim() || null,
            status: 'ACTIVE',
            isMain: true,
            isReceiving: true,
            sortOrder: 0,
          },
        });
      }
      await syncLegacyPaymentSettings(event.id, tx);
    }
  });

  await createAuditLog({
    userId: actor.id,
    action: 'PAYMENT_SETTINGS_UPDATED',
    entityType: 'payment_settings',
    entityId: event.id,
    newValue: {
      upiId,
      upiPayeeName: input.upiPayeeName,
      supportWhatsapp,
      defaultRotateLimitAmount: input.defaultRotateLimitAmount,
    },
    ipAddress,
  });

  return getPaymentSettings(actor, event.id);
}

/** UTR is no longer required — kept for API compatibility. */
export async function assertUtrIfRequired(
  _paymentMethod: string,
  _paymentReference?: string | null,
) {
  return;
}

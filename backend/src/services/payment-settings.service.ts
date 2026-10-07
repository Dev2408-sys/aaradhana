import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import { ForbiddenError, NotFoundError, ValidationAppError } from '../utils/errors';
import { createAuditLog } from './audit.service';
import { buildUpiDeepLink, generateUpiQrDataUrl } from '../utils/upi-qr';

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

async function mapSettings(
  settings: {
    id: string;
    eventId: string;
    upiId: string | null;
    upiPayeeName: string | null;
    upiInstructions: string | null;
    upiQrImageUrl: string | null;
    supportWhatsapp: string | null;
    requireUtrForUpi: boolean;
  },
  event: { id: string; name: string },
  actor: AuthUser,
  amount?: number | null,
) {
  const upiId = settings.upiId?.trim() || null;
  const deepLink = upiId
    ? buildUpiDeepLink({
        upiId,
        payeeName: settings.upiPayeeName,
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

  return {
    event: { id: event.id, name: event.name },
    upiId,
    upiPayeeName: settings.upiPayeeName,
    upiInstructions: settings.upiInstructions,
    upiQrImageUrl: settings.upiQrImageUrl,
    upiDeepLink: deepLink,
    qrCodeDataUrl,
    /** Prefer custom uploaded QR, else generated */
    displayQrUrl: settings.upiQrImageUrl || qrCodeDataUrl,
    supportWhatsapp: settings.supportWhatsapp?.replace(/\D/g, '') || null,
    requireUtrForUpi: false,
    canEdit: isAdmin(actor),
  };
}

export async function getPaymentSettings(
  actor: AuthUser,
  eventId?: string,
  amount?: number | null,
) {
  const event = await activeEvent(eventId);
  let settings = await prisma.paymentSettings.findUnique({
    where: { eventId: event.id },
  });
  if (!settings) {
    settings = await prisma.paymentSettings.create({
      data: {
        eventId: event.id,
        upiId: 'kesariya@upi',
        upiPayeeName: 'Kesariya Navratri 4.0',
        upiInstructions:
          'Scan QR or pay via UPI, then upload payment screenshot with the sale.',
        supportWhatsapp: '919998887766',
        requireUtrForUpi: false,
      },
    });
  }

  return mapSettings(settings, event, actor, amount);
}

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
  },
  ipAddress?: string,
) {
  if (!isAdmin(actor)) {
    throw new ForbiddenError('Only admin can update payment settings');
  }

  const event = await activeEvent(input.eventId);
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

  const settings = await prisma.paymentSettings.upsert({
    where: { eventId: event.id },
    update: {
      upiId,
      upiPayeeName: input.upiPayeeName?.trim() || null,
      upiInstructions: input.upiInstructions?.trim() || null,
      ...(input.upiQrImageUrl !== undefined
        ? { upiQrImageUrl: input.upiQrImageUrl?.trim() || null }
        : {}),
      ...(input.supportWhatsapp !== undefined ? { supportWhatsapp } : {}),
      requireUtrForUpi: false,
    },
    create: {
      eventId: event.id,
      upiId,
      upiPayeeName: input.upiPayeeName?.trim() || null,
      upiInstructions: input.upiInstructions?.trim() || null,
      upiQrImageUrl: input.upiQrImageUrl?.trim() || null,
      supportWhatsapp: supportWhatsapp || '919998887766',
      requireUtrForUpi: false,
    },
  });

  await createAuditLog({
    userId: actor.id,
    action: 'PAYMENT_SETTINGS_UPDATED',
    entityType: 'payment_settings',
    entityId: settings.id,
    newValue: {
      upiId: settings.upiId,
      upiPayeeName: settings.upiPayeeName,
      upiQrImageUrl: settings.upiQrImageUrl,
      supportWhatsapp: settings.supportWhatsapp,
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

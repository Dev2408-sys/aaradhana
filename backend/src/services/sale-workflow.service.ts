import { Prisma, TicketStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import {
  ForbiddenError,
  NotFoundError,
  ValidationAppError,
} from '../utils/errors';
import { createAuditLog } from './audit.service';
import {
  postSaleDebit,
  postSellerPaymentCredit,
  recomputeSaleSettlementStatuses,
} from './ledger.service';
import { createNotifications } from './notification.service';
import { maybeRotateAfterApproval } from './upi-account.service';

function isAdmin(user: AuthUser) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

async function reloadSale(actor: AuthUser, saleId: string) {
  // Dynamic import avoids circular dependency with sale.service ↔ customer-payment
  const { getSaleById } = await import('./sale.service');
  return getSaleById(actor, saleId);
}

function normalizeMobile(mobile: string) {
  return mobile.replace(/\D/g, '').slice(-10);
}

function eventDayLabel(day: number | null | undefined) {
  if (day == null) return 'Event night';
  const date = 10 + day; // Day 1 = 11 Oct
  return `Day ${day} — ${date} Oct 2026`;
}

/** After full customer payment: transfer tickets to customer & unlock WhatsApp send. */
export async function transferTicketsAfterPayment(
  tx: Prisma.TransactionClient,
  saleId: string,
) {
  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    include: { customer: true },
  });
  if (!sale || sale.saleStatus !== 'CONFIRMED') return;
  if (sale.deliveryStatus === 'SENT') return;
  if (sale.paymentStatus !== 'PAID') return;

  const now = new Date();
  await tx.ticket.updateMany({
    where: { saleId, status: { in: [TicketStatus.ISSUED, TicketStatus.SOLD] } },
    data: {
      status: TicketStatus.SOLD,
      customerId: sale.customerId,
      soldAt: now,
    },
  });

  await tx.sale.update({
    where: { id: saleId },
    data: {
      deliveryStatus: 'READY_TO_SEND',
      ticketsTransferredAt: sale.ticketsTransferredAt ?? now,
    },
  });
}

/**
 * Approve pending sale.
 * If seller uploaded payment screenshot (adminPaymentProofUrl): settle base + READY_TO_SEND.
 * Otherwise (admin-created without proof): keep AWAITING_PAYMENT for legacy accounting flow.
 */
export async function approveSale(
  actor: AuthUser,
  saleId: string,
  input: {
    confirmCustomerName: string;
    confirmCustomerMobile: string;
    notes?: string | null;
  },
  ipAddress?: string,
) {
  if (!isAdmin(actor)) throw new ForbiddenError('Only admin can approve sales');

  const confirmName = input.confirmCustomerName?.trim();
  const confirmMobile = normalizeMobile(input.confirmCustomerMobile ?? '');
  if (!confirmName || confirmMobile.length < 10) {
    throw new ValidationAppError('Confirm customer name and 10-digit mobile');
  }

  await prisma.$transaction(
    async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: {
          customer: true,
          seller: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      if (!sale) throw new NotFoundError('Sale not found');
      if (sale.saleStatus !== 'PENDING') {
        throw new ValidationAppError('Only pending sales can be approved');
      }
      if (sale.paymentStatus !== 'PAID') {
        throw new ValidationAppError(
          'Cannot approve — payment must be PAID (screenshot submitted with booking)',
        );
      }
      if (!sale.adminPaymentProofUrl?.trim() && !sale.adminPaymentUtr?.trim()) {
        throw new ValidationAppError(
          'Cannot approve — payment screenshot is missing',
        );
      }

      if (sale.customer.name.trim().toLowerCase() !== confirmName.toLowerCase()) {
        throw new ValidationAppError(
          'Customer name confirmation does not match sale record',
        );
      }
      if (normalizeMobile(sale.customer.mobile) !== confirmMobile) {
        throw new ValidationAppError(
          'Customer mobile confirmation does not match sale record',
        );
      }

      const now = new Date();
      const hasPaymentProof = Boolean(
        sale.adminPaymentProofUrl?.trim() || sale.adminPaymentUtr?.trim(),
      );

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          saleStatus: 'CONFIRMED',
          deliveryStatus: hasPaymentProof ? 'READY_TO_SEND' : 'AWAITING_PAYMENT',
          approvedAt: now,
          approvedByUserId: actor.id,
          soldAt: now,
          ...(hasPaymentProof ? { ticketsTransferredAt: now } : {}),
        },
      });

      await tx.ticket.updateMany({
        where: { saleId: sale.id },
        data: {
          customerId: sale.customerId,
          ...(hasPaymentProof
            ? { status: TicketStatus.SOLD, soldAt: now }
            : {}),
        },
      });

      await postSaleDebit(tx, {
        sellerId: sale.sellerId,
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        baseAmount: sale.baseAmount,
        createdByUserId: actor.id,
      });

      // Screenshot (or legacy UTR) = seller paid admin base via UPI → settle
      if (hasPaymentProof) {
        const paymentId = randomUUID();
        const ref =
          sale.adminPaymentUtr?.trim() ||
          `PROOF:${sale.saleNumber}`;
        await tx.sellerPayment.create({
          data: {
            id: paymentId,
            sellerId: sale.sellerId,
            amount: sale.baseAmount,
            paymentMethod: 'UPI',
            transactionReference: ref,
            idempotencyKey: `sale-settle:${sale.id}`,
            paymentDate: now,
            notes: sale.adminPaymentProofUrl
              ? `Auto-settled from sale ${sale.saleNumber} payment screenshot`
              : `Auto-settled from sale ${sale.saleNumber}`,
            status: 'RECORDED',
            recordedBy: actor.id,
          },
        });
        await postSellerPaymentCredit(tx, {
          sellerId: sale.sellerId,
          sellerPaymentId: paymentId,
          amount: sale.baseAmount,
          createdByUserId: actor.id,
        });
      }

      await recomputeSaleSettlementStatuses(tx, sale.sellerId);

      if (hasPaymentProof) {
        await tx.sale.update({
          where: { id: sale.id },
          data: { settlementStatus: 'PAID' },
        });
      }

      await createAuditLog(
        {
          userId: actor.id,
          action: 'SALE_APPROVED',
          entityType: 'sale',
          entityId: sale.id,
          newValue: {
            saleNumber: sale.saleNumber,
            customerName: sale.customer.name,
            customerMobile: sale.customer.mobile,
            adminPaymentProofUrl: sale.adminPaymentProofUrl,
            settledWithProof: hasPaymentProof,
            notes: input.notes ?? null,
          },
          ipAddress,
        },
        tx,
      );

      await createNotifications(tx, [
        {
          recipientUserId: sale.seller.userId,
          type: 'SALE_CREATED',
          title: 'Sale approved',
          message: hasPaymentProof
            ? `Admin approved ${sale.saleNumber}. Tickets are ready — admin will send to ${sale.customer.name}.`
            : `Admin approved ${sale.saleNumber} for ${sale.customer.name}.`,
          entityType: 'sale',
          entityId: sale.id,
        },
      ]);

      await maybeRotateAfterApproval(
        sale.upiAccountId,
        actor.id,
        ipAddress,
        tx,
      );
    },
    { maxWait: 30000, timeout: 60000 },
  );

  return reloadSale(actor, saleId);
}

export async function rejectSale(
  actor: AuthUser,
  saleId: string,
  input: { reason?: string | null } = {},
  ipAddress?: string,
) {
  if (!isAdmin(actor)) throw new ForbiddenError('Only admin can reject sales');

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: {
        seller: { select: { userId: true } },
        customer: true,
      },
    });
    if (!sale) throw new NotFoundError('Sale not found');
    if (sale.saleStatus !== 'PENDING') {
      throw new ValidationAppError('Only pending sales can be rejected');
    }

    const now = new Date();
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        saleStatus: 'CANCELLED',
        deliveryStatus: 'AWAITING_APPROVAL',
        rejectedAt: now,
        rejectedReason: input.reason?.trim() || 'Rejected by admin',
      },
    });

    await tx.ticket.updateMany({
      where: { saleId: sale.id },
      data: { status: TicketStatus.VOID, customerId: null },
    });

    await createAuditLog(
      {
        userId: actor.id,
        action: 'SALE_REJECTED',
        entityType: 'sale',
        entityId: sale.id,
        newValue: { reason: input.reason ?? null },
        ipAddress,
      },
      tx,
    );

    await createNotifications(tx, [
      {
        recipientUserId: sale.seller.userId,
        type: 'TICKET_CANCELLED',
        title: 'Sale rejected',
        message: `Sale ${sale.saleNumber} was rejected${input.reason ? `: ${input.reason}` : '.'}`,
        entityType: 'sale',
        entityId: sale.id,
      },
    ]);
  });

  return reloadSale(actor, saleId);
}

export async function markWhatsAppSent(
  actor: AuthUser,
  saleId: string,
  ipAddress?: string,
) {
  if (!isAdmin(actor)) {
    throw new ForbiddenError('Only admin can mark ticket delivery');
  }

  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) throw new NotFoundError('Sale not found');
  if (sale.saleStatus !== 'CONFIRMED') {
    throw new ValidationAppError('Sale must be confirmed first');
  }
  if (sale.deliveryStatus !== 'READY_TO_SEND' && sale.deliveryStatus !== 'SENT') {
    throw new ValidationAppError('Tickets are not ready to send yet');
  }

  const now = new Date();
  await prisma.sale.update({
    where: { id: saleId },
    data: {
      deliveryStatus: 'SENT',
      whatsappSentAt: sale.whatsappSentAt ?? now,
      whatsappSentByUserId: actor.id,
    },
  });

  await createAuditLog({
    userId: actor.id,
    action: 'TICKET_WHATSAPP_SENT',
    entityType: 'sale',
    entityId: saleId,
    newValue: { saleNumber: sale.saleNumber },
    ipAddress,
  });

  return reloadSale(actor, saleId);
}

export async function getSaleSlip(actor: AuthUser, saleId: string) {
  const sale = await reloadSale(actor, saleId);
  const dayLabel = eventDayLabel(sale.eventDay);
  const ticketLines = sale.items
    .map((i) => `• ${i.ticketNumber} (${i.ticketTypeCode})`)
    .join('\n');

  const message = [
    `Hello ${sale.customer.name},`,
    ``,
    `Your Kesariya Navratri 4.0 ticket is confirmed.`,
    ``,
    `Sale: ${sale.saleNumber}`,
    `Event: ${dayLabel}`,
    `Tickets (${sale.totalQuantity}):`,
    ticketLines,
    ``,
    `Amount: ₹${sale.totalAmount.toLocaleString('en-IN')}`,
    ``,
    `Venue: Kesariya AC Dome, VIP Road, Vesu, Surat`,
    `Gate: 7:00 PM | Garba: 8:00 / 8:30 PM`,
    ``,
    `Thank you for choosing Kesariya.`,
  ].join('\n');

  const mobile = normalizeMobile(sale.customer.mobile);
  const waLink = `https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`;

  return {
    sale,
    slip: {
      title: 'Kesariya Navratri 4.0 — Ticket Slip',
      saleNumber: sale.saleNumber,
      eventDayLabel: dayLabel,
      customerName: sale.customer.name,
      customerMobile: sale.customer.mobile,
      sellerName: sale.seller.name,
      sellerCode: sale.seller.sellerCode,
      tickets: sale.items.map((i) => ({
        ticketNumber: i.ticketNumber,
        zone: i.ticketTypeCode,
        sellingPrice: i.sellingPrice,
      })),
      totalAmount: sale.totalAmount,
      paymentStatus: sale.customerPaymentStatus,
      adminPaymentProofUrl: sale.adminPaymentProofUrl,
      saleStatus: sale.saleStatus,
      deliveryStatus: sale.deliveryStatus,
      venue: 'Kesariya AC Dome, Opposite Bhagwan Mahavir College, VIP Road, Vesu, Surat',
      gateOpening: '7:00 PM',
      showStart: '8:00 PM / 8:30 PM',
    },
    whatsapp: {
      message,
      link: waLink,
      canSend:
        sale.saleStatus === 'CONFIRMED' &&
        (sale.deliveryStatus === 'READY_TO_SEND' || sale.deliveryStatus === 'SENT'),
    },
  };
}

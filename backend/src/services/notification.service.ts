import { NotificationType, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import { ForbiddenError, NotFoundError } from '../utils/errors';

type Tx = Prisma.TransactionClient | PrismaClient;

function isAdmin(user: AuthUser) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

export async function createNotification(
  tx: Tx,
  input: {
    recipientUserId: string;
    type: NotificationType;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  },
) {
  return tx.notification.create({
    data: {
      recipientUserId: input.recipientUserId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });
}

export async function createNotifications(
  tx: Tx,
  items: Array<{
    recipientUserId: string;
    type: NotificationType;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }>,
) {
  if (items.length === 0) return;
  await tx.notification.createMany({ data: items });
}

export async function listNotifications(
  actor: AuthUser,
  query: { page?: number; pageSize?: number; unreadOnly?: boolean } = {},
) {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 30, 100);
  const where: Prisma.NotificationWhereInput = {
    recipientUserId: actor.id,
    ...(query.unreadOnly ? { isRead: false } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      entityType: n.entityType,
      entityId: n.entityId,
      isRead: n.isRead,
      createdAt: n.createdAt,
      readAt: n.readAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function markNotificationRead(actor: AuthUser, id: string) {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n) throw new NotFoundError('Notification not found');
  if (n.recipientUserId !== actor.id) {
    throw new ForbiddenError('Not your notification');
  }
  if (n.isRead) return n;

  return prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead(actor: AuthUser) {
  await prisma.notification.updateMany({
    where: { recipientUserId: actor.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { ok: true };
}

/** Sidebar / header badge counts for admin (and unread for any role). */
export async function getNotificationBadges(actor: AuthUser) {
  const unreadCount = await prisma.notification.count({
    where: { recipientUserId: actor.id, isRead: false },
  });

  if (!isAdmin(actor)) {
    return {
      unreadCount,
      pendingApprovals: 0,
      readyToSend: 0,
      pendingSellers: 0,
    };
  }

  const [pendingApprovals, readyToSend, pendingSellers] = await Promise.all([
    prisma.sale.count({ where: { saleStatus: 'PENDING' } }),
    prisma.sale.count({
      where: { saleStatus: 'CONFIRMED', deliveryStatus: 'READY_TO_SEND' },
    }),
    prisma.sellerProfile.count({ where: { activationStatus: 'PENDING' } }),
  ]);

  return {
    unreadCount,
    pendingApprovals,
    readyToSend,
    pendingSellers,
  };
}

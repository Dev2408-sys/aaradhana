import { apiClient } from './client';
import type { ApiSuccess } from '../types/auth';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

export type NotificationBadges = {
  unreadCount: number;
  pendingApprovals: number;
  readyToSend: number;
  pendingSellers: number;
};

export async function fetchNotificationBadges() {
  const { data } = await apiClient.get<ApiSuccess<NotificationBadges>>(
    '/notifications/badges',
  );
  return data.data;
}

export async function listNotifications(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get<
    ApiSuccess<{
      items: NotificationItem[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>
  >('/notifications', { params });
  return data.data;
}

export async function markNotificationRead(id: string) {
  const { data } = await apiClient.post<ApiSuccess<NotificationItem>>(
    `/notifications/${id}/read`,
  );
  return data.data;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.post<ApiSuccess<{ ok: boolean }>>(
    '/notifications/read-all',
  );
  return data.data;
}

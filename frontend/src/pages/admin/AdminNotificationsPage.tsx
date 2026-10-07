import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CreditCard, ShoppingBag, UserPlus } from 'lucide-react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/notifications';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { IconBox } from '../../components/ui/icon-box';
import { PageHeader } from '../../components/ui/page-header';
import { formatDate } from '../../lib/seller-display';

function notifIcon(type: string) {
  if (type.includes('SELLER')) return UserPlus;
  if (type.includes('PAYMENT')) return CreditCard;
  if (type.includes('SALE') || type.includes('APPROVAL')) return ShoppingBag;
  return Bell;
}

function linkFor(n: { entityType: string | null; entityId: string | null; type: string }) {
  if (n.entityType === 'sale' && n.entityId) return `/admin/sales/${n.entityId}`;
  if (n.type === 'SELLER_JOINED') return '/admin/sellers';
  return '/admin/sales?saleStatus=PENDING';
}

export function AdminNotificationsPage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => listNotifications({ pageSize: 50 }),
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      await qc.invalidateQueries({ queryKey: ['admin-badges'] });
    },
  });

  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      await qc.invalidateQueries({ queryKey: ['admin-badges'] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Pending approvals and system alerts for admin action."
        action={
          <Button
            variant="outline"
            size="sm"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        }
      />

      {query.isLoading && <p className="text-sm text-navy-700/60">Loading…</p>}
      {query.error && (
        <p className="text-sm text-red-600">{getErrorMessage(query.error)}</p>
      )}

      <div className="space-y-2">
        {query.data?.items.length === 0 && (
          <EmptyState title="No notifications yet" description="New sale and seller alerts will show here." />
        )}
        {query.data?.items.map((n) => (
          <Card
            key={n.id}
            className={`flex flex-wrap items-start justify-between gap-3 p-4 ${
              n.isRead ? 'opacity-70' : 'border-orange-200 bg-orange-50/40'
            }`}
          >
            <div className="flex min-w-0 flex-1 gap-3">
              <IconBox icon={notifIcon(n.type)} size="sm" tone={n.isRead ? 'navy' : 'orange'} />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/50">
                  {n.type.replace(/_/g, ' ')} · {formatDate(n.createdAt)}
                </p>
                <p className="mt-1 font-semibold text-navy-900">{n.title}</p>
                <p className="mt-1 text-sm text-navy-700/80">{n.message}</p>
                <Link
                  to={linkFor(n)}
                  className="mt-2 inline-block text-sm font-semibold text-orange-600"
                  onClick={() => {
                    if (!n.isRead) markOne.mutate(n.id);
                  }}
                >
                  Open →
                </Link>
              </div>
            </div>
            {!n.isRead && (
              <Button
                size="sm"
                variant="outline"
                disabled={markOne.isPending}
                onClick={() => markOne.mutate(n.id)}
              >
                Mark read
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

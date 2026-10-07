import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, MapPin } from 'lucide-react';
import { getSale } from '../../api/sales';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ErrorState } from '../../components/ui/error-state';
import { SkeletonCard } from '../../components/ui/skeleton';
import { StatusBadge } from '../../components/ui/status-badge';
import { formatDate } from '../../lib/seller-display';
import { mediaUrl } from '../../lib/uploads';
import { cn } from '../../lib/utils';

function rupee(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function Timeline({
  sale,
}: {
  sale: {
    soldAt: string;
    customerPaymentStatus: string;
    adminPaymentProofUrl?: string | null;
    approvedAt?: string | null;
    saleStatus: string;
    deliveryStatus: string;
    whatsappSentAt?: string | null;
  };
}) {
  const steps = [
    { key: 'created', label: 'Booking created', done: true, at: sale.soldAt },
    {
      key: 'payment',
      label: 'Payment submitted',
      done: sale.customerPaymentStatus === 'PAID' || Boolean(sale.adminPaymentProofUrl),
      at: sale.soldAt,
    },
    {
      key: 'approved',
      label: 'Admin approved',
      done: sale.saleStatus === 'CONFIRMED',
      at: sale.approvedAt,
    },
    {
      key: 'ready',
      label: 'Ticket ready',
      done: sale.deliveryStatus === 'READY_TO_SEND' || sale.deliveryStatus === 'SENT',
    },
    {
      key: 'sent',
      label: 'Ticket sent',
      done: sale.deliveryStatus === 'SENT',
      at: sale.whatsappSentAt,
    },
  ];

  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs',
                s.done ? 'bg-emerald-500 text-white' : 'bg-navy-700/10 text-navy-700/40',
              )}
            >
              {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            {i < steps.length - 1 && (
              <span className={cn('w-0.5 flex-1 min-h-4', s.done ? 'bg-emerald-300' : 'bg-navy-700/10')} />
            )}
          </div>
          <div className="pb-4">
            <p className={cn('text-sm font-semibold', s.done ? 'text-navy-900' : 'text-navy-700/45')}>
              {s.label}
            </p>
            {s.at && s.done && (
              <p className="text-[11px] text-navy-700/45">{formatDate(s.at)}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SellerSaleDetailPage() {
  const { id = '' } = useParams();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const saleQuery = useQuery({
    queryKey: ['sale', id],
    queryFn: () => getSale(id),
    enabled: Boolean(id),
  });

  const copyTicket = async (num: string) => {
    await navigator.clipboard.writeText(num);
    setCopiedId(num);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (saleQuery.isLoading) {
    return (
      <div className="space-y-3 pb-8">
        <SkeletonCard rows={4} />
        <SkeletonCard />
      </div>
    );
  }
  if (!saleQuery.data) {
    return (
      <ErrorState
        description={getErrorMessage(saleQuery.error)}
        onRetry={() => void saleQuery.refetch()}
      />
    );
  }

  const sale = saleQuery.data;

  return (
    <div className="animate-kesariya-in space-y-4">
      <div>
        <p className="font-mono text-xs text-navy-700/50">{sale.saleNumber}</p>
        <h1 className="font-display text-2xl font-bold text-navy-900">{sale.customer.name}</h1>
        <p className="mt-1 text-sm text-navy-700/70">{sale.customer.mobile}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <StatusBadge status={sale.saleStatus} kind="sale" />
          <StatusBadge status={sale.customerPaymentStatus} kind="payment" />
          <StatusBadge status={sale.deliveryStatus} kind="delivery" />
        </div>
      </div>

      {sale.saleStatus === 'PENDING' && (
        <Card className="border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-950">
          Waiting for admin approval. Tickets are not sent until approved.
        </Card>
      )}

      <Card>
        <h2 className="font-display mb-3 text-base font-semibold">Status timeline</h2>
        <Timeline sale={sale} />
      </Card>

      <Card className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-navy-700/50">Date</p>
          <p className="font-semibold">{formatDate(sale.soldAt)}</p>
        </div>
        <div>
          <p className="text-xs text-navy-700/50">Event day</p>
          <p className="font-semibold">{sale.eventDay ? `Day ${sale.eventDay}` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-navy-700/50">Tickets</p>
          <p className="font-display text-xl font-bold">{sale.totalQuantity}</p>
        </div>
        <div>
          <p className="text-xs text-navy-700/50">Customer total</p>
          <p className="font-semibold">{rupee(sale.totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-navy-700/50">Admin base (UPI)</p>
          <p className="font-semibold">{rupee(sale.baseAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-navy-700/50">Your margin</p>
          <p className="font-semibold text-orange-600">{rupee(sale.sellerProfit)}</p>
        </div>
      </Card>

      <Card>
        <h2 className="font-display mb-1 text-base font-semibold">Event</h2>
        <p className="flex items-center gap-1.5 text-sm text-navy-700/70">
          <MapPin className="h-3.5 w-3.5 text-orange-500" aria-hidden />
          Kesariya AC Dome · VIP Road, Vesu, Surat
        </p>
      </Card>

      {(sale.adminPaymentProofUrl || sale.upiIdSnapshot) && (
        <Card>
          <h2 className="font-display mb-2 text-base font-semibold">Payment proof</h2>
          {sale.upiIdSnapshot && (
            <p className="mb-2 text-sm text-navy-700/70">
              Paid to:{' '}
              <span className="font-semibold text-navy-900">
                {sale.upiAccountLabel ? `${sale.upiAccountLabel} · ` : ''}
                {sale.upiIdSnapshot}
              </span>
            </p>
          )}
          {sale.adminPaymentProofUrl && (
            <img
              src={mediaUrl(sale.adminPaymentProofUrl) ?? undefined}
              alt="Payment proof"
              className="max-h-56 w-full rounded-[var(--radius-md)] border border-navy-700/10 object-contain"
            />
          )}
        </Card>
      )}

      <Card>
        <h2 className="font-display mb-3 text-base font-semibold">
          Ticket numbers ({sale.totalQuantity})
        </h2>
        <div className="space-y-2">
          {sale.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-surface px-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold text-navy-900">{item.ticketNumber}</p>
                <p className="text-xs text-navy-700/55">
                  {item.ticketTypeCode} · {rupee(item.sellingPrice)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 min-w-11 shrink-0"
                onClick={() => void copyTicket(item.ticketNumber)}
                aria-label={`Copy ${item.ticketNumber}`}
              >
                {copiedId === item.ticketNumber ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Link to="/seller/support">
        <Button variant="outline" className="w-full">
          Need help? Contact support
        </Button>
      </Link>
    </div>
  );
}

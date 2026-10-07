import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Ticket } from 'lucide-react';
import { listSales } from '../../api/sales';
import { getErrorMessage } from '../../api/client';
import { EmptySalesIllustration } from '../../assets/illustrations/EmptySales';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { ErrorState } from '../../components/ui/error-state';
import { EventDaySelector } from '../../components/ui/event-day-selector';
import { Input } from '../../components/ui/input';
import { SkeletonCard } from '../../components/ui/skeleton';
import { StatusBadge } from '../../components/ui/status-badge';
import { formatDate } from '../../lib/seller-display';
import { cn } from '../../lib/utils';

const FILTERS = [
  { v: '', label: 'All' },
  { v: 'PENDING', label: 'Pending' },
  { v: 'CONFIRMED', label: 'Approved' },
  { v: 'CANCELLED', label: 'Rejected' },
] as const;

export function SellerSalesPage() {
  const [eventDay, setEventDay] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [saleStatus, setSaleStatus] = useState('');

  const salesQuery = useQuery({
    queryKey: ['seller-sales', eventDay, search, saleStatus],
    queryFn: () =>
      listSales({
        pageSize: 50,
        eventDay: eventDay || undefined,
        search: search || undefined,
        saleStatus: saleStatus || undefined,
      }),
  });

  const items = salesQuery.data?.items ?? [];
  const ticketsSold = items.reduce((n, s) => n + s.totalQuantity, 0);

  return (
    <div className="animate-kesariya-in space-y-4">
      <div className="flex justify-end">
        <Link to="/seller/sell">
          <Button size="sm">
            <Ticket className="h-4 w-4" />
            Sell
          </Button>
        </Link>
      </div>

      <Card className="grid grid-cols-2 gap-3 border-0 bg-navy-950 p-4 text-white shadow-[var(--shadow-elevated)]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
            Tickets sold
          </p>
          <p className="font-display text-3xl font-bold text-orange-400">{ticketsSold}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
            Bookings
          </p>
          <p className="font-display text-3xl font-bold">
            {salesQuery.data?.pagination.total ?? items.length}
          </p>
        </div>
      </Card>

      <EventDaySelector
        variant="chips"
        value={eventDay}
        onChange={setEventDay}
        allowClear
        onClear={() => setEventDay('')}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((o) => (
          <button
            key={o.v || 'all'}
            type="button"
            onClick={() => setSaleStatus(o.v)}
            className={cn(
              'rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition',
              saleStatus === o.v
                ? 'bg-navy-900 text-white'
                : 'border border-navy-700/12 bg-white text-navy-700',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-700/35" />
        <Input
          className="pl-9"
          placeholder="Sale number or customer mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search sales"
        />
      </div>

      {salesQuery.isLoading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
      {salesQuery.error && (
        <ErrorState
          description={getErrorMessage(salesQuery.error)}
          onRetry={() => void salesQuery.refetch()}
        />
      )}

      <div className="space-y-2.5">
        {items.map((sale) => (
          <Link key={sale.id} to={`/seller/sales/${sale.id}`} className="block">
            <Card className="p-4 transition hover:border-orange-300">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-navy-700/45">{sale.saleNumber}</p>
                  <p className="font-display truncate text-lg font-semibold text-navy-900">
                    {sale.customer.name}
                  </p>
                  <p className="mt-0.5 text-xs text-navy-700/55">
                    {sale.eventDay ? `Day ${sale.eventDay} · ` : ''}
                    {formatDate(sale.soldAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusBadge status={sale.saleStatus} kind="sale" />
                    <StatusBadge status={sale.customerPaymentStatus} kind="payment" />
                    <StatusBadge status={sale.deliveryStatus} kind="delivery" />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold tabular-nums text-navy-900">
                    {sale.totalQuantity}
                  </p>
                  <p className="text-[10px] uppercase text-navy-700/45">tickets</p>
                  <p className="mt-1 text-xs font-semibold text-navy-700/70">
                    ₹{sale.totalAmount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {!salesQuery.isLoading && items.length === 0 && (
          <EmptyState
            title="No sales yet"
            description="Sell your first ticket to see bookings here."
            illustration={<EmptySalesIllustration className="mx-auto h-24 w-32" />}
            action={
              <Link to="/seller/sell">
                <Button>Sell ticket</Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}

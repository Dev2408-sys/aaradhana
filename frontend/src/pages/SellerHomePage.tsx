import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Ticket } from 'lucide-react';
import { getSalesSummary, listSales } from '../api/sales';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

export function SellerHomePage() {
  const summaryQuery = useQuery({ queryKey: ['sales-summary'], queryFn: getSalesSummary });
  const salesQuery = useQuery({
    queryKey: ['seller-sales-home'],
    queryFn: () => listSales({ pageSize: 100 }),
  });

  const ticketsSold = salesQuery.data?.items.reduce((n, s) => n + s.totalQuantity, 0) ?? 0;
  const pending = salesQuery.data?.items.filter((s) => s.saleStatus === 'PENDING').length ?? 0;
  const confirmed =
    salesQuery.data?.items.filter((s) => s.saleStatus === 'CONFIRMED').length ?? 0;
  const sent =
    salesQuery.data?.items.filter((s) => s.deliveryStatus === 'SENT').length ?? 0;
  const todayTickets = Number(summaryQuery.data?.ticketsSold ?? 0);
  const loading = salesQuery.isLoading;

  const metrics = [
    { label: 'Today', value: todayTickets, accent: true },
    { label: 'Total', value: ticketsSold },
    { label: 'Pending', value: pending },
    { label: 'Sent', value: sent },
  ];

  return (
    <div className="animate-kesariya-in space-y-5">
      <div>
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-700/45">
          Today&apos;s performance
        </p>
        {loading ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-[var(--radius-md)]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 rounded-[var(--radius-lg)] border border-navy-700/10 bg-white p-1 shadow-[var(--shadow-card)]">
            {metrics.map((m) => (
              <div key={m.label} className="px-1 py-3 text-center">
                <p
                  className={`font-display text-xl font-bold tabular-nums ${
                    m.accent ? 'text-orange-600' : 'text-navy-900'
                  }`}
                >
                  {m.value}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-700/45">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-amber-200/70 bg-amber-50/50 p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70">
            Pending approvals
          </p>
          <p className="font-display mt-1 text-2xl font-bold text-amber-800">{pending}</p>
        </Card>
        <Card className="border-emerald-200/70 bg-emerald-50/40 p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70">
            Approved tickets
          </p>
          <p className="font-display mt-1 text-2xl font-bold text-emerald-800">{confirmed}</p>
        </Card>
      </div>

      <Link to="/seller/sell" className="block">
        <Button size="xl" className="w-full">
          <Ticket className="h-5 w-5" aria-hidden />
          Sell ticket
        </Button>
      </Link>

      <Link
        to="/seller/sales"
        className="flex items-center justify-between rounded-[var(--radius-lg)] border border-navy-700/10 bg-white px-4 py-3.5 shadow-[var(--shadow-card)] transition hover:border-orange-300"
      >
        <div>
          <p className="font-display text-base font-semibold text-navy-900">My sales</p>
          <p className="text-xs text-navy-700/55">View bookings & ticket status</p>
        </div>
        <ChevronRight className="h-5 w-5 text-navy-700/35" aria-hidden />
      </Link>

      <p className="px-1 text-center text-xs leading-relaxed text-navy-700/45">
        Book → pay admin UPI → upload screenshot → submit. Admin approves only when payment is paid.
      </p>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAdminReceivables } from '../../api/accounting';
import { getErrorMessage } from '../../api/client';
import { Card } from '../../components/ui/card';
import { DayFilter } from '../../components/ui/DayFilter';

function rupee(n: unknown) {
  return `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
}

export function AdminAccountingPage() {
  const [eventDay, setEventDay] = useState<number | ''>('');
  const query = useQuery({
    queryKey: ['admin-receivables', eventDay],
    queryFn: () =>
      getAdminReceivables({ eventDay: eventDay === '' ? undefined : eventDay }),
  });

  if (query.isLoading) return <p className="text-sm text-navy-700/60">Loading…</p>;
  if (query.error) return <p className="text-sm text-red-600">{getErrorMessage(query.error)}</p>;

  const d = query.data!;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
          Finance
        </p>
        <h1 className="font-display text-2xl font-bold text-navy-900">Accounting</h1>
        <p className="text-sm text-navy-700/70">
          Customer collections and seller settlements are tracked separately.
        </p>
      </div>

      <DayFilter value={eventDay} onChange={setEventDay} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[10px] uppercase text-navy-700/50">Sales amount</p>
          <p className="font-display text-2xl font-bold">{rupee(d.totalSalesAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase text-navy-700/50">Base receivable</p>
          <p className="font-display text-2xl font-bold">{rupee(d.totalBaseReceivable)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase text-navy-700/50">Seller margin</p>
          <p className="font-display text-2xl font-bold text-orange-600">
            {rupee(d.totalSellerMargin)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase text-navy-700/50">Seller outstanding</p>
          <p className="font-display text-2xl font-bold text-red-600">
            {d.sellerOutstanding == null ? '—' : rupee(d.sellerOutstanding)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase text-navy-700/50">Customer collected</p>
          <p className="font-display text-2xl font-bold">{rupee(d.totalCustomerCollected)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase text-navy-700/50">Customer outstanding</p>
          <p className="font-display text-2xl font-bold">{rupee(d.customerOutstanding)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase text-navy-700/50">Seller settled</p>
          <p className="font-display text-2xl font-bold">
            {eventDay !== '' ? '—' : rupee(d.totalSellerSettled)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase text-navy-700/50">Net admin receivable</p>
          <p className="font-display text-2xl font-bold">
            {d.netAdminReceivable == null ? '—' : rupee(d.netAdminReceivable)}
          </p>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/admin/accounting/sellers">
          <Card className="p-4 hover:border-orange-300">
            <p className="font-semibold">Seller ledgers</p>
            <p className="text-xs text-navy-700/50">Per-seller outstanding & margin</p>
          </Card>
        </Link>
        <Link to="/admin/accounting/payments">
          <Card className="p-4 hover:border-orange-300">
            <p className="font-semibold">Payments</p>
            <p className="text-xs text-navy-700/50">Customer & settlement history</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}

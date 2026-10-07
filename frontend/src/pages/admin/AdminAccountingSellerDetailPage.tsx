import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSellerFinanceSummary, getSellerLedger } from '../../api/accounting';
import { getErrorMessage } from '../../api/client';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { formatDate } from '../../lib/seller-display';

function rupee(n: unknown) {
  return `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
}

export function AdminAccountingSellerDetailPage() {
  const { id = '' } = useParams();
  const summaryQuery = useQuery({
    queryKey: ['admin-seller-finance', id],
    queryFn: () => getSellerFinanceSummary(id),
    enabled: Boolean(id),
  });
  const ledgerQuery = useQuery({
    queryKey: ['admin-seller-ledger', id],
    queryFn: () => getSellerLedger(id, { pageSize: 40 }),
    enabled: Boolean(id),
  });

  if (summaryQuery.isLoading) return <p className="text-sm text-navy-700/60">Loading…</p>;
  if (!summaryQuery.data) {
    return <p className="text-sm text-red-600">{getErrorMessage(summaryQuery.error)}</p>;
  }

  const f = summaryQuery.data;
  const seller = f.seller as { name: string; sellerCode: string };

  return (
    <div className="space-y-6">
      <Link to="/admin/accounting/sellers" className="text-sm font-semibold text-orange-600">
        ← Sellers
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">{seller.name}</h1>
        <p className="text-sm text-navy-700/60">{seller.sellerCode}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-navy-700/50">Outstanding</p>
          <p className="font-display text-xl font-bold text-red-600">{rupee(f.outstanding)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-navy-700/50">Settled</p>
          <p className="font-display text-xl font-bold">{rupee(f.sellerPayments)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-navy-700/50">Margin</p>
          <p className="font-display text-xl font-bold text-orange-600">
            {rupee(f.sellerGrossMargin)}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-display mb-3 text-lg font-semibold">Ledger</h2>
        <div className="space-y-2">
          {ledgerQuery.data?.items.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
            >
              <div>
                <p className="font-semibold">{e.description}</p>
                <p className="text-xs text-navy-700/50">{formatDate(e.createdAt)}</p>
              </div>
              <div className="text-right">
                <Badge tone={e.direction === 'DEBIT' ? 'red' : 'green'}>{e.direction}</Badge>
                <p className="font-semibold">{rupee(e.amount)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

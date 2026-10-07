import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSellerLedger } from '../../api/accounting';
import { getMySeller } from '../../api/sellers';
import { getErrorMessage } from '../../api/client';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { formatDate } from '../../lib/seller-display';

function rupee(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function SellerFinanceLedgerPage() {
  const meQuery = useQuery({ queryKey: ['sellers-me'], queryFn: getMySeller });
  const ledgerQuery = useQuery({
    queryKey: ['seller-ledger', meQuery.data?.id],
    queryFn: () => getSellerLedger(meQuery.data!.id, { pageSize: 40 }),
    enabled: Boolean(meQuery.data?.id),
  });

  return (
    <div className="space-y-4 pb-8">
      <Link to="/seller/finance" className="text-sm font-semibold text-orange-600">
        ← Finance
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy-900">Ledger</h1>

      {ledgerQuery.isLoading && <p className="text-sm text-navy-700/60">Loading…</p>}
      {ledgerQuery.error && (
        <p className="text-sm text-red-600">{getErrorMessage(ledgerQuery.error)}</p>
      )}

      <div className="space-y-2">
        {ledgerQuery.data?.items.map((e) => (
          <Card key={e.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{e.description}</p>
                <p className="font-mono text-[10px] text-navy-700/40">{e.reference}</p>
                <p className="mt-1 text-xs text-navy-700/50">{formatDate(e.createdAt)}</p>
              </div>
              <div className="text-right">
                <Badge tone={e.direction === 'DEBIT' ? 'red' : 'green'}>{e.direction}</Badge>
                <p className="mt-1 font-semibold">{rupee(e.amount)}</p>
                {e.balanceAfter != null && (
                  <p className="text-xs text-navy-700/50">Bal {rupee(e.balanceAfter)}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

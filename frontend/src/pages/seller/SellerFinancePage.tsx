import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSellerFinanceSummary } from '../../api/accounting';
import { getMySeller } from '../../api/sellers';
import { getErrorMessage } from '../../api/client';
import { Card } from '../../components/ui/card';

function rupee(n: unknown) {
  return `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
}

export function SellerFinancePage() {
  const meQuery = useQuery({ queryKey: ['sellers-me'], queryFn: getMySeller });
  const financeQuery = useQuery({
    queryKey: ['seller-finance', meQuery.data?.id],
    queryFn: () => getSellerFinanceSummary(meQuery.data!.id),
    enabled: Boolean(meQuery.data?.id),
  });

  if (financeQuery.isLoading || meQuery.isLoading) {
    return <p className="text-sm text-navy-700/60">Loading finance…</p>;
  }
  if (financeQuery.error) {
    return <p className="text-sm text-red-600">{getErrorMessage(financeQuery.error)}</p>;
  }

  const f = financeQuery.data!;
  const today = f.today as Record<string, unknown>;

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Finance</h1>
        <p className="text-sm text-navy-700/70">
          Customer pays you at your sell price. You settle admin base via UPI + UTR. Margin stays
          with you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-navy-700/50">Today sales</p>
          <p className="font-display text-xl font-bold">{rupee(today?.totalSales)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-navy-700/50">Today margin</p>
          <p className="font-display text-xl font-bold text-orange-600">
            {rupee(today?.sellerGrossMargin)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-navy-700/50">Admin due</p>
          <p className="font-display text-xl font-bold">{rupee(f.adminReceivable)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-navy-700/50">Settled</p>
          <p className="font-display text-xl font-bold">{rupee(f.sellerPayments)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-navy-700/50">Outstanding</p>
          <p className="font-display text-xl font-bold text-red-600">{rupee(f.outstanding)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-navy-700/50">Gross margin</p>
          <p className="font-display text-xl font-bold text-orange-600">
            {rupee(f.sellerGrossMargin)}
          </p>
        </Card>
        <Card className="col-span-2 p-3">
          <p className="text-[10px] uppercase text-navy-700/50">Customer collected</p>
          <p className="font-display text-xl font-bold">{rupee(f.customerCollected)}</p>
          <p className="mt-1 text-xs text-navy-700/50">
            Customer outstanding {rupee(f.customerOutstanding)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/seller/finance/ledger">
          <Card className="p-4 hover:border-orange-300">
            <p className="font-semibold">Ledger</p>
            <p className="text-xs text-navy-700/50">Settlement entries</p>
          </Card>
        </Link>
        <Link to="/seller/finance/payments">
          <Card className="p-4 hover:border-orange-300">
            <p className="font-semibold">Payments</p>
            <p className="text-xs text-navy-700/50">Record & history</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}

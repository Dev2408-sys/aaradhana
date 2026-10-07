import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listSellerAccounting } from '../../api/accounting';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

function rupee(n: unknown) {
  return `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
}

export function AdminAccountingSellersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['admin-accounting-sellers', page, search],
    queryFn: () => listSellerAccounting({ page, pageSize: 15, search: search || undefined }),
  });

  return (
    <div className="space-y-6">
      <Link to="/admin/accounting" className="text-sm font-semibold text-orange-600">
        ← Accounting
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy-900">Seller accounting</h1>

      <Card className="space-y-3">
        <Input
          placeholder="Search seller…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        {query.isLoading && <p className="text-sm text-navy-700/60">Loading…</p>}
        {query.error && <p className="text-sm text-red-600">{getErrorMessage(query.error)}</p>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-navy-700/10 text-xs uppercase text-navy-700/50">
              <tr>
                <th className="px-2 py-3">Seller</th>
                <th className="px-2 py-3">Sales</th>
                <th className="px-2 py-3">Base due</th>
                <th className="px-2 py-3">Settled</th>
                <th className="px-2 py-3">Outstanding</th>
                <th className="px-2 py-3">Margin</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.items.map((row) => {
                const seller = row.seller as { id: string; name: string; sellerCode: string };
                return (
                  <tr key={seller.id} className="border-b border-navy-700/5">
                    <td className="px-2 py-3">
                      <Link className="text-orange-600" to={`/admin/accounting/sellers/${seller.id}`}>
                        {seller.name}
                      </Link>
                      <p className="text-xs text-navy-700/50">{seller.sellerCode}</p>
                    </td>
                    <td className="px-2 py-3">{rupee(row.totalSales)}</td>
                    <td className="px-2 py-3">{rupee(row.adminReceivable)}</td>
                    <td className="px-2 py-3">{rupee(row.sellerPayments)}</td>
                    <td className="px-2 py-3 font-semibold text-red-600">
                      {rupee(row.outstanding)}
                    </td>
                    <td className="px-2 py-3">{rupee(row.sellerGrossMargin)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {query.data && (
          <div className="flex justify-between text-sm">
            <p className="text-navy-700/60">
              Page {query.data.pagination.page} / {query.data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= query.data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

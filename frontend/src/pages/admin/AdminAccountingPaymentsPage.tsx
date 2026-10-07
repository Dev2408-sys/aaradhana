import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSellerPayment,
  listCustomerPayments,
  listSellerPayments,
  reverseCustomerPayment,
  reverseSellerPayment,
} from '../../api/accounting';
import { listSellers } from '../../api/sellers';
import { getErrorMessage } from '../../api/client';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { DayFilter } from '../../components/ui/DayFilter';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { formatDate } from '../../lib/seller-display';

function rupee(n: unknown) {
  return `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
}

export function AdminAccountingPaymentsPage() {
  const qc = useQueryClient();
  const [sellerId, setSellerId] = useState('');
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [eventDay, setEventDay] = useState<number | ''>('');

  const sellersQuery = useQuery({
    queryKey: ['sellers-for-accounting'],
    queryFn: () => listSellers({ pageSize: 100, status: 'ACTIVE' }),
  });
  const customerQuery = useQuery({
    queryKey: ['admin-customer-payments', eventDay],
    queryFn: () =>
      listCustomerPayments({
        pageSize: 30,
        eventDay: eventDay === '' ? undefined : eventDay,
      }),
  });
  const sellerQuery = useQuery({
    queryKey: ['admin-seller-payments'],
    queryFn: () => listSellerPayments({ pageSize: 30 }),
  });

  const createMut = useMutation({
    mutationFn: createSellerPayment,
    onSuccess: async () => {
      setError(null);
      setAmount('');
      setUtr('');
      await qc.invalidateQueries({ queryKey: ['admin-seller-payments'] });
      await qc.invalidateQueries({ queryKey: ['admin-receivables'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const reverseCust = useMutation({
    mutationFn: reverseCustomerPayment,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-customer-payments'] });
    },
  });

  const reverseSeller = useMutation({
    mutationFn: reverseSellerPayment,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-seller-payments'] });
      await qc.invalidateQueries({ queryKey: ['admin-receivables'] });
    },
  });

  return (
    <div className="space-y-6">
      <Link to="/admin/accounting" className="text-sm font-semibold text-orange-600">
        ← Accounting
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy-900">Payments</h1>
      <DayFilter value={eventDay} onChange={setEventDay} />

      <Card className="space-y-3">
        <p className="font-semibold">Record seller settlement (UPI + UTR)</p>
        <p className="text-xs text-navy-700/60">
          Seller pays admin base amount. Capture UTR for every UPI settlement.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Seller</Label>
            <select
              className="h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
            >
              <option value="">Select…</option>
              {sellersQuery.data?.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.sellerCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>UTR / UPI reference</Label>
            <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="Required" />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={createMut.isPending}
              onClick={() =>
                createMut.mutate({
                  sellerId,
                  amount: Number(amount),
                  paymentMethod: 'UPI',
                  paymentReference: utr,
                })
              }
            >
              Record
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display mb-3 text-lg font-semibold">Customer payments</h2>
        <div className="space-y-2">
          {customerQuery.data?.items.map((p) => (
            <div
              key={String(p.id)}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm"
            >
              <div>
                <p className="font-mono text-xs">
                  {(p.sale as { saleNumber?: string })?.saleNumber ?? String(p.saleId)}
                </p>
                <p className="text-xs text-navy-700/50">
                  {String(p.paymentMethod)}
                  {p.paymentReference ? ` · UTR ${String(p.paymentReference)}` : ''} ·{' '}
                  {formatDate(String(p.createdAt))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{String(p.status)}</Badge>
                <span className="font-semibold">{rupee(p.amount)}</span>
                {p.status === 'RECORDED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reverseCust.mutate(String(p.id))}
                  >
                    Reverse
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display mb-3 text-lg font-semibold">Seller settlements</h2>
        <div className="space-y-2">
          {sellerQuery.data?.items.map((p) => (
            <div
              key={String(p.id)}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm"
            >
              <div>
                <p className="font-semibold">
                  {(p.seller as { name?: string })?.name ?? String(p.sellerId)}
                </p>
                <p className="text-xs text-navy-700/50">
                  {String(p.paymentMethod)}
                  {p.transactionReference
                    ? ` · UTR ${String(p.transactionReference)}`
                    : ''}{' '}
                  · {formatDate(String(p.createdAt))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{String(p.status)}</Badge>
                <span className="font-semibold">{rupee(p.amount)}</span>
                {p.status === 'RECORDED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reverseSeller.mutate(String(p.id))}
                  >
                    Reverse
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCustomerPayment,
  createSellerPayment,
  listCustomerPayments,
  listSellerPayments,
} from '../../api/accounting';
import { getPaymentSettings } from '../../api/pricing';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { DayFilter } from '../../components/ui/DayFilter';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { formatDate } from '../../lib/seller-display';
import { mediaUrl } from '../../lib/uploads';

function rupee(n: unknown) {
  return `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
}

export function SellerFinancePaymentsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'customer' | 'settlement'>('customer');
  const [saleId, setSaleId] = useState('');
  const [custAmount, setCustAmount] = useState('');
  const [custMethod, setCustMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [custUtr, setCustUtr] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleUtr, setSettleUtr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [eventDay, setEventDay] = useState<number | ''>('');

  const upiQuery = useQuery({
    queryKey: ['payment-settings'],
    queryFn: () => getPaymentSettings(),
  });

  const customerQuery = useQuery({
    queryKey: ['my-customer-payments', eventDay],
    queryFn: () =>
      listCustomerPayments({
        pageSize: 20,
        eventDay: eventDay === '' ? undefined : eventDay,
      }),
  });
  const sellerQuery = useQuery({
    queryKey: ['my-seller-payments'],
    queryFn: () => listSellerPayments({ pageSize: 20 }),
  });

  const custMut = useMutation({
    mutationFn: createCustomerPayment,
    onSuccess: async () => {
      setError(null);
      setCustAmount('');
      setCustUtr('');
      await qc.invalidateQueries({ queryKey: ['my-customer-payments'] });
      await qc.invalidateQueries({ queryKey: ['seller-finance'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const settleMut = useMutation({
    mutationFn: createSellerPayment,
    onSuccess: async () => {
      setError(null);
      setSettleAmount('');
      setSettleUtr('');
      await qc.invalidateQueries({ queryKey: ['my-seller-payments'] });
      await qc.invalidateQueries({ queryKey: ['seller-finance'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="space-y-4 pb-8">
      <Link to="/seller/finance" className="text-sm font-semibold text-orange-600">
        ← Finance
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy-900">Payments</h1>
      <p className="text-sm text-navy-700/70">
        Main flow: pay admin on Sell Ticket (UPI/QR + screenshot). This page is for extra records.
      </p>
      <DayFilter value={eventDay} onChange={setEventDay} />

      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            tab === 'customer' ? 'bg-navy-900 text-white' : 'bg-white'
          }`}
          onClick={() => setTab('customer')}
        >
          Customer
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            tab === 'settlement' ? 'bg-navy-900 text-white' : 'bg-white'
          }`}
          onClick={() => setTab('settlement')}
        >
          Admin settlement
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {tab === 'customer' ? (
        <>
          <Card className="space-y-3">
            <p className="font-semibold">Record customer payment</p>
            <div>
              <Label>Sale ID</Label>
              <Input value={saleId} onChange={(e) => setSaleId(e.target.value)} />
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={custAmount}
                onChange={(e) => setCustAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Method</Label>
              <select
                className="h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
                value={custMethod}
                onChange={(e) => setCustMethod(e.target.value as 'CASH' | 'UPI')}
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            {custMethod === 'UPI' && (
              <div>
                <Label>Note / reference (optional)</Label>
                <Input
                  value={custUtr}
                  onChange={(e) => setCustUtr(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            )}
            <Button
              className="w-full"
              disabled={custMut.isPending}
              onClick={() =>
                custMut.mutate({
                  saleId,
                  amount: Number(custAmount),
                  paymentMethod: custMethod,
                  paymentReference: custMethod === 'UPI' ? custUtr : null,
                })
              }
            >
              Record payment
            </Button>
          </Card>
          <div className="space-y-2">
            {customerQuery.data?.items.map((p) => (
              <Card key={String(p.id)} className="p-3 text-sm">
                <div className="flex justify-between">
                  <span>{String((p.sale as { saleNumber?: string })?.saleNumber ?? p.saleId)}</span>
                  <span className="font-semibold">{rupee(p.amount)}</span>
                </div>
                <p className="text-xs text-navy-700/50">
                  {String(p.paymentMethod)}
                  {p.paymentReference ? ` · Ref ${String(p.paymentReference)}` : ''} ·{' '}
                  {String(p.status)} · {formatDate(String(p.createdAt))}
                </p>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {upiQuery.data && (
            <Card className="space-y-2 border-orange-200 bg-orange-50/50">
              <p className="text-xs font-semibold uppercase text-orange-700">Pay admin on UPI</p>
              <p className="font-display text-lg font-bold">{upiQuery.data.upiPayeeName}</p>
              <p className="font-mono text-sm">{upiQuery.data.upiId}</p>
              {mediaUrl(upiQuery.data.displayQrUrl) && (
                <img
                  src={mediaUrl(upiQuery.data.displayQrUrl)!}
                  alt="UPI QR"
                  className="mx-auto h-40 w-40 object-contain"
                />
              )}
              {upiQuery.data.upiInstructions && (
                <p className="text-xs text-navy-700/70">{upiQuery.data.upiInstructions}</p>
              )}
            </Card>
          )}
          <Card className="space-y-3">
            <p className="font-semibold">Record extra settlement (optional)</p>
            <p className="text-xs text-navy-700/60">
              Prefer paying + screenshot on Sell Ticket. Use this only for manual top-ups.
            </p>
            <div>
              <Label>Amount (admin base receivable)</Label>
              <Input
                type="number"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input
                value={settleUtr}
                onChange={(e) => setSettleUtr(e.target.value)}
                placeholder="Optional note"
              />
            </div>
            <Button
              className="w-full"
              disabled={settleMut.isPending}
              onClick={() =>
                settleMut.mutate({
                  amount: Number(settleAmount),
                  paymentMethod: 'UPI',
                  paymentReference: settleUtr || `MANUAL-${Date.now()}`,
                })
              }
            >
              Record settlement
            </Button>
          </Card>
          <div className="space-y-2">
            {sellerQuery.data?.items.map((p) => (
              <Card key={String(p.id)} className="p-3 text-sm">
                <div className="flex justify-between">
                  <span>{String(p.paymentMethod)}</span>
                  <span className="font-semibold">{rupee(p.amount)}</span>
                </div>
                <p className="text-xs text-navy-700/50">
                  {p.transactionReference
                    ? `Ref ${String(p.transactionReference)} · `
                    : ''}
                  {String(p.status)} · {formatDate(String(p.createdAt))}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

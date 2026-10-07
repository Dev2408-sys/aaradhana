import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createSale, fetchTicketTypes, searchCustomers } from '../../api/sales';
import { listSellers } from '../../api/sellers';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { getNavratriDays, suggestNavratriDay } from '../../lib/navratri-days';

function rupee(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function AdminCreateSalePage() {
  const navigate = useNavigate();
  const typesQuery = useQuery({ queryKey: ['ticket-types'], queryFn: fetchTicketTypes });
  const sellersQuery = useQuery({
    queryKey: ['sellers-active'],
    queryFn: () => listSellers({ pageSize: 100, status: 'ACTIVE' }),
  });
  const days = getNavratriDays();

  const [sellerId, setSellerId] = useState('');
  const [eventDay, setEventDay] = useState(suggestNavratriDay() ?? 1);
  const [goldQty, setGoldQty] = useState(0);
  const [vipQty, setVipQty] = useState(0);
  const [goldPrice, setGoldPrice] = useState('799');
  const [vipPrice, setVipPrice] = useState('999');
  const [customer, setCustomer] = useState({ name: '', mobile: '', email: '' });
  const [existingNote, setExistingNote] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID'>('PENDING');
  const [error, setError] = useState<string | null>(null);

  const gold = typesQuery.data?.ticketTypes.find((t) => t.code === 'GOLD');
  const vip = typesQuery.data?.ticketTypes.find((t) => t.code === 'VIP');
  const goldBase = Number(gold?.basePrice ?? 400);
  const vipBase = Number(vip?.basePrice ?? 400);

  const summary = useMemo(() => {
    const gPrice = Number(goldPrice) || 0;
    const vPrice = Number(vipPrice) || 0;
    const customerTotal = goldQty * gPrice + vipQty * vPrice;
    const baseAmount = goldQty * goldBase + vipQty * vipBase;
    return {
      customerTotal,
      baseAmount,
      margin: customerTotal - baseAmount,
      qty: goldQty + vipQty,
    };
  }, [goldQty, vipQty, goldPrice, vipPrice, goldBase, vipBase]);

  const lookupCustomer = async (mobile: string) => {
    setCustomer((c) => ({ ...c, mobile }));
    if (mobile.replace(/\D/g, '').length < 10) {
      setExistingNote(null);
      return;
    }
    try {
      const result = await searchCustomers(mobile);
      const match = result.items[0];
      if (match) {
        setExistingNote(`Existing customer found: ${match.name}`);
        setCustomer((c) => ({ ...c, name: c.name || match.name, mobile: match.mobile }));
      } else {
        setExistingNote(null);
      }
    } catch {
      setExistingNote(null);
    }
  };

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: (data) => navigate(`/admin/sales/${data.id}`),
    onError: (err) => {
      setError(getErrorMessage(err, 'Sale could not be completed. No tickets were issued.'));
    },
  });

  const confirm = () => {
    setError(null);
    if (!sellerId) {
      setError('Select a seller');
      return;
    }
    if (!eventDay || eventDay < 1 || eventDay > 10) {
      setError('Select Navratri day (Day 1–10)');
      return;
    }
    if (!gold || !vip) {
      setError('Ticket types failed to load');
      return;
    }
    if (summary.qty < 1) {
      setError('Select at least one ticket');
      return;
    }
    if (!customer.name.trim() || customer.mobile.replace(/\D/g, '').length < 10) {
      setError('Customer name and valid mobile are required');
      return;
    }

    const items = [];
    if (goldQty > 0) {
      items.push({
        ticketTypeId: gold.id,
        quantity: goldQty,
        sellingPrice: Number(goldPrice),
      });
    }
    if (vipQty > 0) {
      items.push({
        ticketTypeId: vip.id,
        quantity: vipQty,
        sellingPrice: Number(vipPrice),
      });
    }

    mutation.mutate({
      sellerId,
      eventDay,
      customer: {
        name: customer.name.trim(),
        mobile: customer.mobile.trim(),
        email: customer.email || null,
      },
      items,
      customerPaymentStatus: paymentStatus,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/admin/sales" className="text-sm font-semibold text-orange-600">
        ← Back to sales
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Create sale</h1>
        <p className="text-sm text-navy-700/70">Issue tickets on behalf of a seller.</p>
      </div>

      <Card className="space-y-3">
        <div>
          <Label>Seller</Label>
          <select
            className="h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
          >
            <option value="">Select seller…</option>
            {sellersQuery.data?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.sellerCode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Navratri day (11–20 Oct)</Label>
          <select
            className="h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
            value={eventDay}
            onChange={(e) => setEventDay(Number(e.target.value))}
          >
            {days.map((d) => (
              <option key={d.day} value={d.day}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {[
          {
            label: 'GOLD',
            qty: goldQty,
            setQty: setGoldQty,
            price: goldPrice,
            setPrice: setGoldPrice,
            base: goldBase,
          },
          {
            label: 'VIP',
            qty: vipQty,
            setQty: setVipQty,
            price: vipPrice,
            setPrice: setVipPrice,
            base: vipBase,
          },
        ].map((row) => (
          <div key={row.label} className="rounded-xl border border-navy-700/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{row.label}</p>
                <p className="text-xs text-navy-700/50">Base {rupee(row.base)}</p>
              </div>
              <Input
                className="w-24"
                type="number"
                min={0}
                value={row.qty}
                onChange={(e) => row.setQty(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            {row.qty > 0 && (
              <div className="mt-3">
                <Label>Selling price / ticket</Label>
                <Input
                  type="number"
                  value={row.price}
                  onChange={(e) => row.setPrice(e.target.value)}
                />
              </div>
            )}
          </div>
        ))}

        <div>
          <Label>Customer mobile</Label>
          <Input
            value={customer.mobile}
            onChange={(e) => void lookupCustomer(e.target.value)}
            inputMode="numeric"
          />
          {existingNote && <p className="mt-1 text-xs text-emerald-700">{existingNote}</p>}
        </div>
        <div>
          <Label>Customer name</Label>
          <Input
            value={customer.name}
            onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
          />
        </div>
        <div>
          <Label>Email (optional)</Label>
          <Input
            value={customer.email}
            onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
          />
        </div>
        <div>
          <Label>Customer payment</Label>
          <select
            className="h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as 'PENDING' | 'PAID')}
          >
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
          </select>
        </div>

        <dl className="space-y-1 border-t border-navy-700/10 pt-3 text-sm">
          <div className="flex justify-between font-semibold">
            <dt>Customer total</dt>
            <dd>{rupee(summary.customerTotal)}</dd>
          </div>
          <div className="flex justify-between text-navy-700/70">
            <dt>Base</dt>
            <dd>{rupee(summary.baseAmount)}</dd>
          </div>
          <div className="flex justify-between text-orange-600">
            <dt>Seller margin</dt>
            <dd>{rupee(summary.margin)}</dd>
          </div>
        </dl>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <Button className="w-full" size="lg" disabled={mutation.isPending} onClick={confirm}>
          {mutation.isPending ? 'Issuing…' : 'CONFIRM & ISSUE TICKETS'}
        </Button>
      </Card>
    </div>
  );
}

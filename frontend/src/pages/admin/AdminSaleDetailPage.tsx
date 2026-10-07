import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveSale,
  getSale,
  getSaleSlip,
  markWhatsAppSent,
  rejectSale,
} from '../../api/sales';
import { getErrorMessage } from '../../api/client';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ImageViewer } from '../../components/ui/image-viewer';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { StatusBadge } from '../../components/ui/status-badge';
import { formatDate } from '../../lib/seller-display';
import { mediaUrl } from '../../lib/uploads';

function rupee(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function AdminSaleDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [proofOpen, setProofOpen] = useState(false);

  const saleQuery = useQuery({
    queryKey: ['admin-sale', id],
    queryFn: () => getSale(id),
    enabled: Boolean(id),
  });

  const slipQuery = useQuery({
    queryKey: ['admin-sale-slip', id],
    queryFn: () => getSaleSlip(id),
    enabled: Boolean(id),
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['admin-sale', id] });
    await qc.invalidateQueries({ queryKey: ['admin-sale-slip', id] });
    await qc.invalidateQueries({ queryKey: ['admin-sales'] });
    await qc.invalidateQueries({ queryKey: ['admin-badges'] });
    await qc.invalidateQueries({ queryKey: ['admin-ticket-sales'] });
  };

  const approveMut = useMutation({
    mutationFn: () => {
      const sale = saleQuery.data!;
      return approveSale(id, {
        confirmCustomerName: sale.customer.name,
        confirmCustomerMobile: sale.customer.mobile,
      });
    },
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectSale(id, rejectReason || null),
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const sentMut = useMutation({
    mutationFn: () => markWhatsAppSent(id),
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (saleQuery.isLoading) {
    return <p className="text-sm text-navy-700/60">Loading sale…</p>;
  }
  if (!saleQuery.data) {
    return <p className="text-sm text-red-600">{getErrorMessage(saleQuery.error)}</p>;
  }

  const sale = saleQuery.data;
  const slip = slipQuery.data;

  return (
    <div className="space-y-6">
      <Link to="/admin/sales" className="text-sm font-semibold text-orange-600">
        ← Back to sales
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-navy-700/50">{sale.saleNumber}</p>
          <h1 className="font-display text-2xl font-bold text-navy-900">{sale.customer.name}</h1>
          <p className="mt-1 text-sm text-navy-700/70">
            Seller: {sale.seller.name} ({sale.seller.sellerCode}) · {sale.customer.mobile}
          </p>
          {sale.eventDay != null && (
            <p className="mt-1 text-xs text-navy-700/50">Event Day {sale.eventDay}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={sale.saleStatus} kind="sale" />
          <StatusBadge status={sale.customerPaymentStatus} kind="payment" />
          <StatusBadge status={sale.deliveryStatus} kind="delivery" />
          <Badge tone="grey">{sale.settlementStatus}</Badge>
        </div>
      </div>

      {sale.saleStatus === 'PENDING' && sale.customerPaymentStatus !== 'PAID' && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Cannot approve until payment status is PAID (seller must submit screenshot with booking).
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Card className="grid gap-2 sm:grid-cols-3">
        {[
          {
            step: '1',
            label: 'Seller paid + screenshot',
            done: Boolean(sale.adminPaymentProofUrl || sale.adminPaymentUtr),
          },
          {
            step: '2',
            label: 'Admin approve',
            done: sale.saleStatus === 'CONFIRMED' || sale.saleStatus === 'CANCELLED',
          },
          {
            step: '3',
            label: 'Ticket sent',
            done: sale.deliveryStatus === 'SENT',
          },
        ].map((s) => (
          <div
            key={s.step}
            className={`rounded-lg px-3 py-2 text-sm ${
              s.done ? 'bg-emerald-50 text-emerald-800' : 'bg-surface text-navy-700/60'
            }`}
          >
            <p className="text-[10px] font-semibold uppercase">Step {s.step}</p>
            <p className="font-medium">{s.label}</p>
          </div>
        ))}
      </Card>

      <Card className="grid gap-4 sm:grid-cols-3 md:grid-cols-6">
        <div>
          <p className="text-xs text-navy-700/50">Date</p>
          <p className="font-semibold">{formatDate(sale.soldAt)}</p>
        </div>
        <div>
          <p className="text-xs text-navy-700/50">Tickets</p>
          <p className="font-semibold">{sale.totalQuantity}</p>
        </div>
        <div>
          <p className="text-xs text-navy-700/50">Gold / VIP</p>
          <p className="font-semibold">
            {sale.goldCount} / {sale.vipCount}
          </p>
        </div>
        <div>
          <p className="text-xs text-navy-700/50">Customer total</p>
          <p className="font-semibold">{rupee(sale.totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-navy-700/50">Base (UTR)</p>
          <p className="font-semibold">{rupee(sale.baseAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-navy-700/50">Margin</p>
          <p className="font-semibold text-orange-600">{rupee(sale.sellerProfit)}</p>
        </div>
      </Card>

      {(sale.adminPaymentProofUrl || sale.adminPaymentUtr || sale.upiIdSnapshot) && (
        <Card className="border-emerald-200 bg-emerald-50/40 space-y-2">
          <p className="text-xs uppercase text-navy-700/50">Seller payment proof</p>
          {(sale.upiIdSnapshot || sale.upiAccountLabel) && (
            <p className="text-sm text-navy-900">
              Paid to:{' '}
              <strong>
                {sale.upiAccountLabel ? `${sale.upiAccountLabel} · ` : ''}
                {sale.upiIdSnapshot}
              </strong>
              {sale.upiPayeeNameSnapshot ? ` (${sale.upiPayeeNameSnapshot})` : ''}
            </p>
          )}
          <p className="text-xs text-navy-700/60">
            Amount claimed: {rupee(sale.baseAmount)} · Settlement: {sale.settlementStatus}
          </p>
          {sale.adminPaymentProofUrl && (
            <button
              type="button"
              className="mt-1 block w-full text-left"
              onClick={() => setProofOpen(true)}
            >
              <img
                src={mediaUrl(sale.adminPaymentProofUrl) ?? undefined}
                alt="Payment screenshot"
                className="max-h-72 rounded-lg border border-navy-700/10 bg-white object-contain transition hover:opacity-95"
              />
              <span className="mt-1.5 inline-block text-xs font-semibold text-orange-600">
                Tap to enlarge
              </span>
            </button>
          )}
          {sale.adminPaymentUtr && !sale.adminPaymentProofUrl && (
            <p className="font-mono text-sm">Legacy UTR: {sale.adminPaymentUtr}</p>
          )}
        </Card>
      )}

      {sale.saleStatus === 'PENDING' && (
        <Card className="space-y-3 border-orange-200 bg-orange-50/40">
          <h2 className="font-display text-lg font-semibold">Pending approval</h2>
          <p className="text-sm text-navy-700/70">
            Verify payment screenshot, then approve. Tickets become ready to send immediately.
          </p>
          <div className="rounded-lg border border-navy-700/10 bg-white p-3 text-sm">
            <p>
              <span className="text-navy-700/50">Customer:</span>{' '}
              <strong>{sale.customer.name}</strong> · {sale.customer.mobile}
            </p>
            <p className="mt-1">
              <span className="text-navy-700/50">Tickets:</span> {sale.totalQuantity} (
              {sale.goldCount} Gold / {sale.vipCount} VIP)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                approveMut.isPending || sale.customerPaymentStatus !== 'PAID'
              }
              onClick={() => approveMut.mutate()}
            >
              {approveMut.isPending ? 'Approving…' : 'Approve sale'}
            </Button>
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <div className="min-w-[160px] flex-1">
                <Label>Reject reason</Label>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <Button
                variant="outline"
                disabled={rejectMut.isPending}
                onClick={() => rejectMut.mutate()}
              >
                Reject
              </Button>
            </div>
          </div>
        </Card>
      )}

      {(sale.deliveryStatus === 'READY_TO_SEND' || sale.deliveryStatus === 'SENT') && (
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Send tickets</h2>
          <p className="text-sm text-navy-700/70">
            Open WhatsApp, send the slip, then mark as sent.
          </p>
          {slip && (
            <>
              <div className="rounded-lg border border-navy-700/15 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                  {String(slip.slip.title)}
                </p>
                <p className="mt-1 font-mono text-xs">{sale.saleNumber}</p>
                <h3 className="font-display mt-2 text-xl font-bold">{sale.customer.name}</h3>
                <p className="text-sm">{sale.customer.mobile}</p>
                <p className="mt-2 text-sm text-navy-700/70">{String(slip.slip.eventDayLabel)}</p>
                <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto font-mono text-xs">
                  {sale.items.map((i) => (
                    <li key={i.id}>
                      {i.ticketNumber} · {i.ticketTypeCode} · {rupee(i.sellingPrice)}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm font-semibold">Total {rupee(sale.totalAmount)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  Print slip
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void navigator.clipboard.writeText(slip.whatsapp.message)}
                >
                  Copy WhatsApp message
                </Button>
                {slip.whatsapp.canSend && (
                  <a
                    href={slip.whatsapp.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
                  >
                    Open WhatsApp
                  </a>
                )}
                {sale.deliveryStatus === 'READY_TO_SEND' && (
                  <Button disabled={sentMut.isPending} onClick={() => sentMut.mutate()}>
                    Mark ticket sent
                  </Button>
                )}
                {sale.deliveryStatus === 'SENT' && sale.whatsappSentAt && (
                  <p className="self-center text-xs text-emerald-700">
                    Sent {formatDate(sale.whatsappSentAt)}
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      )}

      <ImageViewer
        open={proofOpen}
        onClose={() => setProofOpen(false)}
        src={mediaUrl(sale.adminPaymentProofUrl)}
        title={`${sale.saleNumber} · Payment proof`}
        meta={
          <p className="text-xs text-navy-700/55">
            {sale.seller.name} · {rupee(sale.baseAmount)} · {sale.customerPaymentStatus}
          </p>
        }
      />

      <Card>
        <h2 className="font-display mb-3 text-lg font-semibold">
          Ticket numbers ({sale.totalQuantity})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-navy-700/10 text-xs uppercase text-navy-700/50">
              <tr>
                <th className="px-2 py-2">Ticket</th>
                <th className="px-2 py-2">Zone</th>
                <th className="px-2 py-2">Selling</th>
                <th className="px-2 py-2">Base</th>
                <th className="px-2 py-2">Margin</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-b border-navy-700/5">
                  <td className="px-2 py-2 font-mono text-xs">{item.ticketNumber}</td>
                  <td className="px-2 py-2">{item.ticketTypeCode}</td>
                  <td className="px-2 py-2">{rupee(item.sellingPrice)}</td>
                  <td className="px-2 py-2">{rupee(item.basePrice)}</td>
                  <td className="px-2 py-2">{rupee(item.sellerMargin)}</td>
                  <td className="px-2 py-2">
                    <Badge>{item.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

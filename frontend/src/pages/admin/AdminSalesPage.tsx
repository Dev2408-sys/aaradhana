import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listSales } from '../../api/sales';
import { listSellers } from '../../api/sellers';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { DayFilter } from '../../components/ui/DayFilter';
import { EmptyState } from '../../components/ui/empty-state';
import { Input } from '../../components/ui/input';
import { PageHeader } from '../../components/ui/page-header';
import { StatusBadge } from '../../components/ui/status-badge';
import { formatDate } from '../../lib/seller-display';
import { mediaUrl } from '../../lib/uploads';

function rupee(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function AdminSalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [eventDay, setEventDay] = useState<number | ''>('');
  const saleStatus = searchParams.get('saleStatus') ?? '';
  const [deliveryStatus, setDeliveryStatus] = useState('');

  const sellersQuery = useQuery({
    queryKey: ['sellers-for-filter'],
    queryFn: () => listSellers({ pageSize: 100 }),
  });

  const salesQuery = useQuery({
    queryKey: ['admin-sales', page, search, sellerId, eventDay, saleStatus, deliveryStatus],
    queryFn: () =>
      listSales({
        page,
        pageSize: 15,
        search: search || undefined,
        sellerId: sellerId || undefined,
        eventDay: eventDay || undefined,
        saleStatus: saleStatus || undefined,
        deliveryStatus: deliveryStatus || undefined,
      }),
  });

  const isApprovals = saleStatus === 'PENDING';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kesariya Navratri 4.0 · Aaradhana Group"
        title={isApprovals ? 'Approvals' : 'Sales'}
        description={
          isApprovals
            ? 'Review payment screenshots and approve pending bookings.'
            : 'Filter by Day 1–10 (11–20 Oct). One row per booking.'
        }
        action={
          <Link to="/admin/sales/create">
            <Button>Create sale</Button>
          </Link>
        }
      />

      <Card className="space-y-3">
        <DayFilter
          value={eventDay}
          onChange={(d) => {
            setPage(1);
            setEventDay(d);
          }}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Search sale #, customer, ticket…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <select
            className="h-11 rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
            value={sellerId}
            onChange={(e) => {
              setPage(1);
              setSellerId(e.target.value);
            }}
          >
            <option value="">All sellers</option>
            {sellersQuery.data?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.sellerCode})
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
            value={saleStatus}
            onChange={(e) => {
              setPage(1);
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set('saleStatus', e.target.value);
              else next.delete('saleStatus');
              setSearchParams(next);
            }}
          >
            <option value="">All sale status</option>
            <option value="PENDING">Pending approval</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            className="h-11 rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
            value={deliveryStatus}
            onChange={(e) => {
              setPage(1);
              setDeliveryStatus(e.target.value);
            }}
          >
            <option value="">All delivery</option>
            <option value="AWAITING_APPROVAL">Awaiting approval</option>
            <option value="AWAITING_PAYMENT">Awaiting payment</option>
            <option value="READY_TO_SEND">Ready to send</option>
            <option value="SENT">WhatsApp sent</option>
          </select>
        </div>

        {salesQuery.isLoading && <p className="text-sm text-navy-700/60">Loading…</p>}
        {salesQuery.error && (
          <p className="text-sm text-red-600">{getErrorMessage(salesQuery.error)}</p>
        )}

        {isApprovals && (
          <div className="space-y-3 md:hidden">
            {salesQuery.data?.items.map((sale) => (
              <Link
                key={sale.id}
                to={`/admin/sales/${sale.id}`}
                className="block rounded-[var(--radius-md)] border border-orange-200 bg-orange-50/40 p-3"
              >
                <div className="flex gap-3">
                  {sale.adminPaymentProofUrl ? (
                    <img
                      src={mediaUrl(sale.adminPaymentProofUrl) ?? undefined}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-navy-700/10 text-[10px] text-navy-700/50">
                      No proof
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-navy-700/45">{sale.saleNumber}</p>
                    <p className="font-semibold text-navy-900">{sale.customer.name}</p>
                    <p className="text-xs text-navy-700/55">
                      {sale.seller.name} · Day {sale.eventDay ?? '—'} · {sale.totalQuantity} tix
                      {sale.upiIdSnapshot ? ` · ${sale.upiIdSnapshot}` : ''}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <StatusBadge status={sale.customerPaymentStatus} kind="payment" />
                      <StatusBadge status={sale.saleStatus} kind="sale" />
                    </div>
                  </div>
                  <p className="text-sm font-bold">{rupee(sale.baseAmount)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className={isApprovals ? 'hidden overflow-x-auto md:block' : 'overflow-x-auto'}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-navy-700/10 text-xs uppercase text-navy-700/50">
              <tr>
                {isApprovals && <th className="px-2 py-3">Proof</th>}
                <th className="px-2 py-3">Sale</th>
                <th className="px-2 py-3">Day</th>
                <th className="px-2 py-3">Seller</th>
                <th className="px-2 py-3">Customer</th>
                <th className="px-2 py-3">G/V</th>
                <th className="px-2 py-3">Tickets</th>
                <th className="px-2 py-3">Total</th>
                <th className="px-2 py-3">Base</th>
                <th className="px-2 py-3">Paid to</th>
                <th className="px-2 py-3">Margin</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Pay</th>
                <th className="px-2 py-3">Delivery</th>
                <th className="px-2 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {salesQuery.data?.items.map((sale) => (
                <tr
                  key={sale.id}
                  className={`border-b border-navy-700/5 ${
                    sale.saleStatus === 'PENDING' ? 'bg-amber-50/40' : ''
                  }`}
                >
                  {isApprovals && (
                    <td className="px-2 py-3">
                      {sale.adminPaymentProofUrl ? (
                        <img
                          src={mediaUrl(sale.adminPaymentProofUrl) ?? undefined}
                          alt="Proof"
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-xs text-navy-700/40">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-2 py-3 font-mono text-xs">
                    <Link className="font-semibold text-orange-600" to={`/admin/sales/${sale.id}`}>
                      {sale.saleNumber}
                    </Link>
                  </td>
                  <td className="px-2 py-3">
                    {sale.eventDay != null ? `D${sale.eventDay}` : '—'}
                  </td>
                  <td className="px-2 py-3">{sale.seller.name}</td>
                  <td className="px-2 py-3">{sale.customer.name}</td>
                  <td className="px-2 py-3">
                    {sale.goldCount}/{sale.vipCount}
                  </td>
                  <td className="px-2 py-3 font-semibold">{sale.totalQuantity}</td>
                  <td className="px-2 py-3">{rupee(sale.totalAmount)}</td>
                  <td className="px-2 py-3">{rupee(sale.baseAmount)}</td>
                  <td className="px-2 py-3 font-mono text-[11px] text-navy-700/70">
                    {sale.upiIdSnapshot ?? '—'}
                  </td>
                  <td className="px-2 py-3">{rupee(sale.sellerProfit)}</td>
                  <td className="px-2 py-3">
                    <StatusBadge status={sale.saleStatus} kind="sale" />
                  </td>
                  <td className="px-2 py-3">
                    <StatusBadge status={sale.customerPaymentStatus} kind="payment" />
                  </td>
                  <td className="px-2 py-3">
                    <StatusBadge status={sale.deliveryStatus} kind="delivery" />
                  </td>
                  <td className="px-2 py-3">{formatDate(sale.soldAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!salesQuery.isLoading && (salesQuery.data?.items.length ?? 0) === 0 && (
          <EmptyState
            title={isApprovals ? 'No pending approvals' : 'No sales found'}
            description={
              isApprovals
                ? 'New seller bookings with payment proof will appear here.'
                : 'Try adjusting filters or search.'
            }
          />
        )}

        {salesQuery.data && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-navy-700/60">
              Page {salesQuery.data.pagination.page} / {salesQuery.data.pagination.totalPages}
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
                disabled={page >= salesQuery.data.pagination.totalPages}
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

import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTicketStats, listSales, type SaleSummary } from '../../api/sales';
import { listSellers } from '../../api/sellers';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { DayFilter } from '../../components/ui/DayFilter';
import { Input } from '../../components/ui/input';
import { StatusBadge } from '../../components/ui/status-badge';
import { formatDate } from '../../lib/seller-display';

function rupee(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function AdminTicketsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [eventDay, setEventDay] = useState<number | ''>('');
  const [saleStatus, setSaleStatus] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statsQuery = useQuery({ queryKey: ['ticket-stats'], queryFn: getTicketStats });
  const sellersQuery = useQuery({
    queryKey: ['sellers-for-ticket-filter'],
    queryFn: () => listSellers({ pageSize: 100 }),
  });
  const salesQuery = useQuery({
    queryKey: [
      'admin-ticket-sales',
      page,
      search,
      sellerId,
      eventDay,
      saleStatus,
      deliveryStatus,
    ],
    queryFn: () =>
      listSales({
        page,
        pageSize: 20,
        search: search || undefined,
        sellerId: sellerId || undefined,
        eventDay: eventDay || undefined,
        saleStatus: saleStatus || undefined,
        deliveryStatus: deliveryStatus || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Ticket Records</h1>
        <p className="text-sm text-navy-700/70">
          One row per sale / customer. Expand or open view for ticket numbers.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-[10px] uppercase text-navy-700/50">Total issued</p>
          <p className="font-display text-2xl font-bold">{statsQuery.data?.totalIssued ?? '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase text-navy-700/50">Gold</p>
          <p className="font-display text-2xl font-bold">{statsQuery.data?.goldIssued ?? '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase text-navy-700/50">VIP</p>
          <p className="font-display text-2xl font-bold">{statsQuery.data?.vipIssued ?? '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase text-navy-700/50">Today</p>
          <p className="font-display text-2xl font-bold">{statsQuery.data?.todayIssued ?? '—'}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <DayFilter
          value={eventDay}
          onChange={(d) => {
            setPage(1);
            setEventDay(d);
          }}
        />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Sale #, mobile, customer, seller…"
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
              setSaleStatus(e.target.value);
            }}
          >
            <option value="">All sale status</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
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
            <option value="AWAITING_APPROVAL">AWAITING_APPROVAL</option>
            <option value="READY_TO_SEND">READY_TO_SEND</option>
            <option value="SENT">SENT</option>
            <option value="AWAITING_PAYMENT">AWAITING_PAYMENT</option>
          </select>
        </div>

        {salesQuery.isLoading && <p className="text-sm text-navy-700/60">Loading…</p>}
        {salesQuery.error && (
          <p className="text-sm text-red-600">{getErrorMessage(salesQuery.error)}</p>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-navy-700/10 text-xs uppercase text-navy-700/50">
              <tr>
                <th className="px-2 py-3">Sale</th>
                <th className="px-2 py-3">Customer</th>
                <th className="px-2 py-3">Seller</th>
                <th className="px-2 py-3">Tickets</th>
                <th className="px-2 py-3">Gold/VIP</th>
                <th className="px-2 py-3">Amount</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Delivery</th>
                <th className="px-2 py-3">Date</th>
                <th className="px-2 py-3">View</th>
              </tr>
            </thead>
            <tbody>
              {salesQuery.data?.items.map((s: SaleSummary) => (
                <Fragment key={s.id}>
                  <tr className="border-b border-navy-700/5">
                    <td className="px-2 py-3 font-mono text-xs">{s.saleNumber}</td>
                    <td className="px-2 py-3">
                      <p className="font-medium">{s.customer.name}</p>
                      <p className="text-xs text-navy-700/50">{s.customer.mobile}</p>
                    </td>
                    <td className="px-2 py-3">{s.seller.name}</td>
                    <td className="px-2 py-3">
                      <span className="font-display text-lg font-bold text-navy-900">
                        {s.totalQuantity}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      {s.goldCount} / {s.vipCount}
                    </td>
                    <td className="px-2 py-3">{rupee(s.totalAmount)}</td>
                    <td className="px-2 py-3">
                      <StatusBadge status={s.saleStatus} kind="sale" />
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge status={s.deliveryStatus} kind="delivery" />
                    </td>
                    <td className="px-2 py-3">{formatDate(s.soldAt)}</td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="text-left text-sm font-semibold text-orange-600"
                          onClick={() =>
                            setExpandedId((cur) => (cur === s.id ? null : s.id))
                          }
                        >
                          {expandedId === s.id ? 'Hide numbers' : `View ${s.totalQuantity} tickets`}
                        </button>
                        <Link className="text-xs text-navy-700/60" to={`/admin/sales/${s.id}`}>
                          Sale detail →
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {expandedId === s.id && (
                    <tr className="bg-surface/60">
                      <td colSpan={10} className="px-4 py-3">
                        <p className="mb-2 text-xs font-semibold uppercase text-navy-700/50">
                          Ticket numbers ({s.tickets.length})
                        </p>
                        <ul className="grid gap-1 font-mono text-xs sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {s.tickets.map((t) => (
                            <li key={t.id}>
                              {t.ticketNumber}
                              {t.zone ? ` · ${t.zone}` : ''}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {salesQuery.data && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-navy-700/60">
              Page {salesQuery.data.pagination.page} / {salesQuery.data.pagination.totalPages} ·{' '}
              {salesQuery.data.pagination.total} sales
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

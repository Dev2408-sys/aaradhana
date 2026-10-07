import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RefreshCw } from 'lucide-react';
import {
  fetchAdminAlerts,
  fetchAdminDaily,
  fetchAdminHealth,
  fetchAdminPayments,
  fetchAdminPulse,
  fetchAdminRecentPayments,
  fetchAdminRecentSales,
  fetchAdminSellerPerf,
  fetchAdminSettlements,
  fetchAdminSummary,
  fetchAdminTarget,
  fetchAdminTicketMix,
  fetchAdminTopMasters,
  fetchAdminTopSellers,
  type DashboardQuery,
} from '../api/dashboard';
import { getErrorMessage } from '../api/client';
import { DashboardFilterBar } from '../components/dashboard/DashboardFilterBar';
import {
  DashError,
  DashSkeleton,
  EmptyNote,
  KpiCard,
  ProgressBar,
  SectionCard,
} from '../components/dashboard/KpiCard';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { num, pct, rupee, rupeeFull } from '../lib/format';

const REFRESH_MS = 45_000;
const COLORS = ['#f97316', '#1a2438', '#10b981', '#64748b', '#ef4444'];

function useDashQuery<T>(
  key: string,
  filters: DashboardQuery,
  fn: (q: DashboardQuery) => Promise<T>,
) {
  return useQuery({
    queryKey: ['admin-dash', key, filters],
    queryFn: () => fn(filters),
    refetchInterval: REFRESH_MS,
  });
}

export function AdminHomePage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<DashboardQuery>({ eventDay: '' });
  const q = useMemo(() => filters, [filters]);

  const summary = useDashQuery('summary', q, fetchAdminSummary);
  const daily = useDashQuery('daily', q, fetchAdminDaily);
  const target = useDashQuery('target', q, fetchAdminTarget);
  const mix = useDashQuery('mix', q, fetchAdminTicketMix);
  const topSellers = useDashQuery('top-sellers', q, fetchAdminTopSellers);
  const topMasters = useDashQuery('top-masters', q, fetchAdminTopMasters);
  const payments = useDashQuery('payments', q, fetchAdminPayments);
  const settlements = useDashQuery('settlements', q, fetchAdminSettlements);
  const recentSales = useDashQuery('recent-sales', q, fetchAdminRecentSales);
  const recentPays = useDashQuery('recent-pays', q, fetchAdminRecentPayments);
  const pulse = useDashQuery('pulse', q, fetchAdminPulse);
  const sellerPerf = useDashQuery('seller-perf', q, (f) =>
    fetchAdminSellerPerf({ ...f, page: 1, limit: 15 }),
  );
  const alerts = useDashQuery('alerts', q, fetchAdminAlerts);
  const health = useDashQuery('health', q, fetchAdminHealth);

  const event = summary.data?.event as Record<string, unknown> | undefined;
  const kpis = summary.data?.kpis as Record<string, number> | undefined;
  const updatedAt = (summary.data?.generatedAt as string) || pulse.data?.refreshedAt;

  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: ['admin-dash'] });
  };

  const mixChart = [
    { name: 'GOLD', value: Number(mix.data?.gold ?? 0) },
    { name: 'VIP', value: Number(mix.data?.vip ?? 0) },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
            Kesariya Navratri 4.0
          </p>
          <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            Event control room
          </h1>
          {event && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-navy-700/70">
              <Badge tone={event.lifecycleStatus === 'LIVE' ? 'green' : 'navy'}>
                {String(event.lifecycleStatus)}
              </Badge>
              <span>11 Oct → 20 Oct 2026</span>
              <span>·</span>
              <span>{String(event.venue)}</span>
              {event.currentEventDay != null && (
                <>
                  <span>·</span>
                  <span className="font-semibold text-navy-900">
                    DAY {String(event.currentEventDay)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button type="button" variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          {updatedAt != null && updatedAt !== '' ? (
            <p className="text-[11px] text-navy-700/50">
              Last updated:{' '}
              {new Date(String(updatedAt)).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          ) : null}
        </div>
      </div>

      <DashboardFilterBar value={filters} onChange={setFilters} />

      {health.data && (
        <SectionCard
          title="Event health"
          subtitle={health.data.reasons.join(' · ')}
          action={<Badge tone={health.data.status === 'ON_TRACK' ? 'green' : 'yellow'}>{health.data.status.replace('_', ' ')}</Badge>}
        >
          <p className="text-xs text-navy-700/55">
            Based on daily/event ticket pace, collection ratio, and active sellers — not a financial
            guarantee.
          </p>
        </SectionCard>
      )}

      {summary.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <DashSkeleton key={i} />
          ))}
        </div>
      ) : summary.error ? (
        <DashError message={getErrorMessage(summary.error)} onRetry={() => void summary.refetch()} />
      ) : kpis ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KpiCard
            label="Total tickets sold"
            value={num(kpis.totalTicketsSold)}
            hint={`+${num(kpis.todayTickets)} today`}
            tone="orange"
          />
          <KpiCard
            label="Today's tickets"
            value={`${num(kpis.todayTickets)} / ${num(kpis.todayTarget)}`}
            hint={pct(kpis.todayAchievementPercent)}
          >
            <ProgressBar value={kpis.todayTickets} max={kpis.todayTarget} />
          </KpiCard>
          <KpiCard label="Total sales value" value={rupee(kpis.totalSalesValue)} />
          <KpiCard label="Admin receivable" value={rupee(kpis.adminReceivable)} />
          <KpiCard label="Customer collection" value={rupee(kpis.customerCollection)} tone="green" />
          <KpiCard label="Customer outstanding" value={rupee(kpis.customerOutstanding)} tone="red" />
          <KpiCard
            label="Seller settlement"
            value={kpis.sellerSettlement == null ? '—' : rupee(kpis.sellerSettlement)}
            hint={filters.eventDay ? 'Hidden when day-filtered' : undefined}
          />
          <KpiCard
            label="Seller outstanding"
            value={kpis.sellerOutstanding == null ? '—' : rupee(kpis.sellerOutstanding)}
          />
          <KpiCard label="Seller gross margin" value={rupee(kpis.sellerGrossMargin)} tone="orange" />
          <KpiCard label="Active sellers" value={num(kpis.activeSellers)} />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Event sales target" subtitle="11,000 tickets across 10 days">
          {target.isLoading ? (
            <DashSkeleton className="h-40" />
          ) : target.error ? (
            <DashError message={getErrorMessage(target.error)} onRetry={() => void target.refetch()} />
          ) : target.data ? (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="font-display text-3xl font-bold text-navy-900">
                    {num(target.data.actual)}
                  </p>
                  <p className="text-sm text-navy-700/60">of {num(target.data.target)} target</p>
                </div>
                <p className="font-display text-2xl font-bold text-orange-600">
                  {pct(target.data.achievementPercent)}
                </p>
              </div>
              <ProgressBar value={Number(target.data.actual)} max={Number(target.data.target)} />
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-navy-700/50">Remaining</dt>
                  <dd className="font-semibold">{num(target.data.remaining)}</dd>
                </div>
                <div>
                  <dt className="text-navy-700/50">Required daily pace</dt>
                  <dd className="font-semibold">{num(target.data.requiredDailyPace)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-navy-700/50">Current pace projection</dt>
                  <dd className="font-semibold">
                    {num(target.data.projectedFinal)} tickets
                    <span className="ml-1 text-xs font-normal text-navy-700/50">
                      (not guaranteed)
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="Live event pulse" subtitle="Scoped to selected / current day">
          {pulse.isLoading ? (
            <DashSkeleton className="h-40" />
          ) : pulse.error ? (
            <DashError message={getErrorMessage(pulse.error)} onRetry={() => void pulse.refetch()} />
          ) : pulse.data ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <PulseStat label="Tickets" value={num(pulse.data.ticketsSoldToday)} />
              <PulseStat label="Sales" value={rupee(pulse.data.salesToday)} />
              <PulseStat label="Collection" value={rupee(pulse.data.collectionToday)} />
              <PulseStat label="Active sellers" value={num(pulse.data.activeSellersToday)} />
              <PulseStat label="Customers" value={num(pulse.data.customersToday)} />
              <PulseStat
                label="Gold / VIP"
                value={`${num(pulse.data.goldToday)} / ${num(pulse.data.vipToday)}`}
              />
              {pulse.data.topSellerToday != null ? (
                <div className="col-span-2 rounded-lg bg-orange-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase text-orange-700">
                    Today&apos;s top seller
                  </p>
                  <p className="font-display text-lg font-bold text-navy-900">
                    {String((pulse.data.topSellerToday as { name?: string }).name)}
                  </p>
                  <p className="text-xs text-navy-700/60">
                    {num((pulse.data.topSellerToday as { ticketsSold?: number }).ticketsSold)} tickets
                    · {rupee((pulse.data.topSellerToday as { salesValue?: number }).salesValue)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Daily tickets vs target">
          {daily.isLoading ? (
            <DashSkeleton className="h-64" />
          ) : daily.error ? (
            <DashError message={getErrorMessage(daily.error)} />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={daily.data?.days ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="ticketsSold"
                    name="Actual"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="targetTickets"
                    name="Target"
                    stroke="#1a2438"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Daily sales value">
          {daily.isLoading ? (
            <DashSkeleton className="h-64" />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={daily.data?.days ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => rupeeFull(v)} />
                  <Bar dataKey="salesValue" name="Customer sales" fill="#f97316" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Gold vs VIP">
          {mix.isLoading ? (
            <DashSkeleton className="h-52" />
          ) : mixChart.length === 0 ? (
            <EmptyNote text="No sales recorded yet." />
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={mixChart} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                      {mixChart.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-sm">
                Gold {pct(mix.data?.goldPercent)} · VIP {pct(mix.data?.vipPercent)} · Total{' '}
                {num(mix.data?.total)}
              </p>
            </>
          )}
        </SectionCard>

        <SectionCard title="Payment status" subtitle="Confirmed sales by customer paymentStatus">
          {payments.isLoading ? (
            <DashSkeleton className="h-52" />
          ) : (
            <div className="h-52">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={(payments.data?.slices ?? []).filter((s) => Number(s.saleCount) > 0)}
                    dataKey="saleCount"
                    nameKey="status"
                    outerRadius={70}
                  >
                    {(payments.data?.slices ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Settlement status" subtitle="Sale settlementStatus track">
          {settlements.isLoading ? (
            <DashSkeleton className="h-52" />
          ) : (
            <div className="space-y-2 text-sm">
              {(settlements.data?.slices ?? []).length === 0 ? (
                <EmptyNote text="No settlement data for this period." />
              ) : (
                settlements.data?.slices.map((s) => (
                  <div
                    key={String(s.status)}
                    className="flex items-center justify-between rounded-lg bg-surface px-3 py-2"
                  >
                    <span className="font-semibold">{String(s.status)}</span>
                    <span>
                      {num(s.saleCount)} sales · {rupee(s.baseAmount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title={String(topSellers.data?.scopeLabel ?? 'Top sellers')}
        subtitle="Ranked by tickets sold, then sales value"
      >
        {topSellers.isLoading ? (
          <DashSkeleton className="h-64" />
        ) : topSellers.error ? (
          <DashError message={getErrorMessage(topSellers.error)} />
        ) : (topSellers.data?.items.length ?? 0) === 0 ? (
          <EmptyNote text="No seller activity for this period." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart
                  layout="vertical"
                  data={(topSellers.data?.items ?? []).slice(0, 10).map((s) => ({
                    name: String(s.name),
                    tickets: Number(s.ticketsSold),
                  }))}
                  margin={{ left: 16, right: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="#f97316" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {topSellers.data?.items.map((s) => (
                <Link
                  key={String(s.sellerId)}
                  to={`/admin/sellers/${s.sellerId}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-navy-700/10 px-3 py-2 hover:border-orange-300"
                >
                  <div>
                    <p className="font-semibold text-navy-900">
                      #{String(s.rank)} {String(s.name)}
                    </p>
                    <p className="text-xs text-navy-700/55">
                      {String(s.sellerCode)}
                      {s.masterSeller
                        ? ` · Master: ${(s.masterSeller as { name: string }).name}`
                        : ''}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{num(s.ticketsSold)} tix</p>
                    <p className="text-xs text-navy-700/55">{rupee(s.salesValue)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Top master sellers" subtitle="Ranked by team tickets">
        {topMasters.isLoading ? (
          <DashSkeleton className="h-64" />
        ) : (topMasters.data?.items.length ?? 0) === 0 ? (
          <EmptyNote text="No master seller activity." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart
                  layout="vertical"
                  data={(topMasters.data?.items ?? []).map((m) => ({
                    name: String(m.name),
                    tickets: Number(m.teamTickets),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="#1a2438" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[520px] w-full text-left text-sm">
                <thead className="text-xs uppercase text-navy-700/45">
                  <tr>
                    <th className="py-2">Master</th>
                    <th>Active</th>
                    <th>Tickets</th>
                    <th>Sales</th>
                    <th>Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {topMasters.data?.items.map((m) => (
                    <tr key={String(m.masterSellerId)} className="border-t border-navy-700/5">
                      <td className="py-2 font-semibold">
                        #{String(m.rank)} {String(m.name)}
                      </td>
                      <td>
                        {num(m.activeSellers)}/{num(m.teamSize)}
                      </td>
                      <td>{num(m.teamTickets)}</td>
                      <td>{rupee(m.teamSales)}</td>
                      <td>{num(m.avgTicketsPerActiveSeller)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Seller performance" subtitle="Sales contribution = seller tickets / filtered total">
        {sellerPerf.isLoading ? (
          <DashSkeleton className="h-48" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="text-xs uppercase text-navy-700/45">
                <tr>
                  <th className="py-2">Rank</th>
                  <th>Seller</th>
                  <th>Master</th>
                  <th>Tickets</th>
                  <th>Sales</th>
                  <th>Margin</th>
                  <th>Collected</th>
                  <th>Outstd</th>
                  <th>Contrib</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(sellerPerf.data?.items ?? []).map((s) => (
                  <tr key={String(s.sellerId)} className="border-t border-navy-700/5">
                    <td className="py-2">{String(s.rank)}</td>
                    <td>
                      <p className="font-semibold">{String(s.name)}</p>
                      <p className="text-xs text-navy-700/45">{String(s.sellerCode)}</p>
                    </td>
                    <td className="text-xs">
                      {s.master ? (s.master as { name: string }).name : '—'}
                    </td>
                    <td>{num(s.totalTickets)}</td>
                    <td>{rupee(s.sales)}</td>
                    <td>{rupee(s.margin)}</td>
                    <td>{rupee(s.customerCollection)}</td>
                    <td>{rupee(s.customerOutstanding)}</td>
                    <td>{pct(s.salesContributionPercent)}</td>
                    <td>
                      <Link
                        className="font-semibold text-orange-600"
                        to={`/admin/sellers/${s.sellerId}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Recent sales">
          {recentSales.isLoading ? (
            <DashSkeleton />
          ) : (recentSales.data?.items.length ?? 0) === 0 ? (
            <EmptyNote text="No sales recorded yet." />
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {recentSales.data?.items.map((s) => (
                <Link
                  key={String(s.id)}
                  to={`/admin/sales/${s.id}`}
                  className="flex justify-between gap-2 rounded-lg bg-surface px-3 py-2 hover:bg-orange-50"
                >
                  <div>
                    <p className="font-mono text-xs">{String(s.saleNumber)}</p>
                    <p className="font-semibold">{String(s.customerName)}</p>
                    <p className="text-xs text-navy-700/50">
                      {String(s.sellerName)} · Day {String(s.eventDay ?? '—')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{rupee(s.amount)}</p>
                    <Badge>{String(s.paymentStatus)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent payments">
          {recentPays.isLoading ? (
            <DashSkeleton />
          ) : (recentPays.data?.items.length ?? 0) === 0 ? (
            <EmptyNote text="No payments recorded yet." />
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {recentPays.data?.items.map((p) => (
                <div
                  key={`${p.type}-${p.id}`}
                  className="flex justify-between gap-2 rounded-lg bg-surface px-3 py-2"
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-navy-700/45">
                      {String(p.type)}
                    </p>
                    <p className="font-semibold">{String(p.person)}</p>
                    <p className="text-xs text-navy-700/50">
                      {p.saleNumber ? String(p.saleNumber) : 'Settlement'} · {String(p.method)}
                      {p.reference ? ` · ${String(p.reference)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{rupee(p.amount)}</p>
                    <p className="text-xs text-navy-700/45">{String(p.status)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Collection / settlement attention" subtitle="Needs Attention — by outstanding amount">
        {alerts.isLoading ? (
          <DashSkeleton />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-navy-700/45">
                Customer outstanding
              </p>
              {(alerts.data?.customerOutstanding.length ?? 0) === 0 ? (
                <EmptyNote text="No customer outstanding in scope." />
              ) : (
                alerts.data?.customerOutstanding.map((c) => (
                  <Link
                    key={String(c.saleId)}
                    to={`/admin/sales/${c.saleId}`}
                    className="mb-2 flex justify-between rounded-lg border border-navy-700/10 px-3 py-2 text-sm"
                  >
                    <span>
                      {String(c.customerName)}
                      <span className="block text-xs text-navy-700/45">{String(c.saleNumber)}</span>
                    </span>
                    <span className="font-semibold text-red-600">{rupee(c.outstanding)}</span>
                  </Link>
                ))
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-navy-700/45">
                Seller outstanding
              </p>
              {(alerts.data?.sellerOutstanding.length ?? 0) === 0 ? (
                <EmptyNote text="No seller outstanding." />
              ) : (
                alerts.data?.sellerOutstanding.map((s) => (
                  <Link
                    key={String(s.sellerId)}
                    to={`/admin/accounting/sellers/${s.sellerId}`}
                    className="mb-2 flex justify-between rounded-lg border border-navy-700/10 px-3 py-2 text-sm"
                  >
                    <span>
                      {String(s.name)}
                      <span className="block text-xs text-navy-700/45">{String(s.sellerCode)}</span>
                    </span>
                    <span className="font-semibold text-red-600">{rupee(s.outstanding)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function PulseStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2">
      <p className="text-[10px] uppercase text-navy-700/45">{label}</p>
      <p className="font-semibold text-navy-900">{value}</p>
    </div>
  );
}

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
  fetchMasterSummary,
  fetchMasterTeam,
  fetchSellerDaily,
  fetchSellerFinance,
  fetchSellerRecentSales,
  fetchSellerSummary,
  fetchSellerTicketMix,
  type DashboardQuery,
} from '../../api/dashboard';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../features/auth/AuthContext';
import { DashboardFilterBar } from '../../components/dashboard/DashboardFilterBar';
import {
  DashError,
  DashSkeleton,
  EmptyNote,
  KpiCard,
  SectionCard,
} from '../../components/dashboard/KpiCard';
import { Button } from '../../components/ui/button';
import { num, pct, rupee } from '../../lib/format';

const REFRESH_MS = 45_000;
const COLORS = ['#f97316', '#1a2438'];

export function SellerDashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<DashboardQuery>({ eventDay: '' });
  const q = useMemo(() => filters, [filters]);
  const isMaster = user?.role === 'MASTER_SELLER';

  const summary = useQuery({
    queryKey: ['seller-dash', 'summary', q],
    queryFn: () => fetchSellerSummary(q),
    refetchInterval: REFRESH_MS,
  });
  const daily = useQuery({
    queryKey: ['seller-dash', 'daily', q],
    queryFn: () => fetchSellerDaily(q),
    refetchInterval: REFRESH_MS,
  });
  const mix = useQuery({
    queryKey: ['seller-dash', 'mix', q],
    queryFn: () => fetchSellerTicketMix(q),
    refetchInterval: REFRESH_MS,
  });
  const recent = useQuery({
    queryKey: ['seller-dash', 'recent', q],
    queryFn: () => fetchSellerRecentSales(q),
    refetchInterval: REFRESH_MS,
  });
  const finance = useQuery({
    queryKey: ['seller-dash', 'finance', q],
    queryFn: () => fetchSellerFinance(q),
    refetchInterval: REFRESH_MS,
  });
  const master = useQuery({
    queryKey: ['seller-dash', 'master', q],
    queryFn: () => fetchMasterSummary(q),
    enabled: isMaster,
    refetchInterval: REFRESH_MS,
  });
  const team = useQuery({
    queryKey: ['seller-dash', 'team', q],
    queryFn: () => fetchMasterTeam(q),
    enabled: isMaster,
    refetchInterval: REFRESH_MS,
  });

  const my = summary.data?.my;
  const mixChart = [
    { name: 'GOLD', value: Number(mix.data?.gold ?? 0) },
    { name: 'VIP', value: Number(mix.data?.vip ?? 0) },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">My dashboard</h1>
          <p className="text-sm text-navy-700/65">
            {isMaster ? 'Your performance + team (your network only)' : 'Your personal sales & finance'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void qc.invalidateQueries({ queryKey: ['seller-dash'] })}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <DashboardFilterBar value={filters} onChange={setFilters} showSellerFilters={false} />

      {summary.isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <DashSkeleton key={i} className="h-20" />
          ))}
        </div>
      ) : summary.error ? (
        <DashError message={getErrorMessage(summary.error)} onRetry={() => void summary.refetch()} />
      ) : my ? (
        <div className="grid grid-cols-2 gap-2">
          <KpiCard label="Today tickets" value={num(my.todayTickets)} tone="orange" />
          <KpiCard label="Today sales" value={rupee(my.todaySales)} />
          <KpiCard label="Today collection" value={rupee(my.todayCollection)} tone="green" />
          <KpiCard label="Today outstanding" value={rupee(my.todayOutstanding)} tone="red" />
          <KpiCard label="Total tickets" value={num(my.totalTickets)} />
          <KpiCard label="Total sales" value={rupee(my.totalSales)} />
          <KpiCard label="Total margin" value={rupee(my.totalMargin)} tone="orange" />
          <KpiCard label="Settlement due" value={rupee(my.settlementOutstanding)} tone="red" />
        </div>
      ) : null}

      {isMaster && (
        <SectionCard title="Team overview">
          {master.isLoading ? (
            <DashSkeleton />
          ) : master.error ? (
            <DashError message={getErrorMessage(master.error)} />
          ) : master.data ? (
            <div className="grid grid-cols-2 gap-2">
              <KpiCard label="My tickets" value={num(master.data.myTickets)} />
              <KpiCard label="My sales" value={rupee(master.data.mySales)} />
              <KpiCard label="Team tickets" value={num(master.data.teamTickets)} tone="orange" />
              <KpiCard label="Team sales" value={rupee(master.data.teamSales)} />
              <KpiCard label="Team sellers" value={num(master.data.teamSellers)} />
              <KpiCard label="Active sellers" value={num(master.data.activeSellers)} />
              <KpiCard label="Team collection" value={rupee(master.data.teamCollection)} tone="green" />
              <KpiCard label="Team outstanding" value={rupee(master.data.teamOutstanding)} tone="red" />
            </div>
          ) : null}
        </SectionCard>
      )}

      <SectionCard title="My sales trend" subtitle="Tickets by event day">
        {daily.isLoading ? (
          <DashSkeleton className="h-52" />
        ) : (
          <div className="h-52">
            <ResponsiveContainer>
              <LineChart data={daily.data?.days ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="dayNumber" tickFormatter={(d) => `D${d}`} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="ticketsSold" stroke="#f97316" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title="Gold / VIP">
          {mix.isLoading ? (
            <DashSkeleton className="h-44" />
          ) : mixChart.length === 0 ? (
            <EmptyNote text="No sales recorded yet." />
          ) : (
            <>
              <div className="h-40">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={mixChart} dataKey="value" nameKey="name" outerRadius={60}>
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
                Gold {pct(mix.data?.goldPercent)} · VIP {pct(mix.data?.vipPercent)}
              </p>
            </>
          )}
        </SectionCard>

        <SectionCard title="Finance summary">
          {finance.isLoading ? (
            <DashSkeleton className="h-44" />
          ) : finance.error ? (
            <DashError message={getErrorMessage(finance.error)} />
          ) : finance.data ? (
            <dl className="space-y-2 text-sm">
              <FinRow label="Gross sales" value={rupee(finance.data.grossSales)} />
              <FinRow label="Admin base" value={rupee(finance.data.adminBaseAmount)} />
              <FinRow label="Gross margin" value={rupee(finance.data.grossMargin)} />
              <FinRow label="Customer collected" value={rupee(finance.data.customerCollection)} />
              <FinRow label="Customer outstanding" value={rupee(finance.data.customerOutstanding)} />
              <FinRow label="Seller settlement" value={rupee(finance.data.sellerSettlement)} />
              <FinRow label="Seller outstanding" value={rupee(finance.data.sellerOutstanding)} />
              {typeof finance.data.note === 'string' ? (
                <p className="text-xs text-navy-700/50">{finance.data.note}</p>
              ) : null}
            </dl>
          ) : null}
        </SectionCard>
      </div>

      <SectionCard title="Recent sales">
        {recent.isLoading ? (
          <DashSkeleton />
        ) : (recent.data?.items.length ?? 0) === 0 ? (
          <EmptyNote text="No sales recorded yet." />
        ) : (
          <div className="space-y-2 text-sm">
            {recent.data?.items.map((s) => (
              <Link
                key={String(s.id)}
                to={`/seller/sales/${s.id}`}
                className="flex justify-between rounded-lg bg-surface px-3 py-2"
              >
                <div>
                  <p className="font-mono text-xs">{String(s.saleNumber)}</p>
                  <p className="font-semibold">{String(s.customerName)}</p>
                  <p className="text-xs text-navy-700/50">Day {String(s.eventDay ?? '—')}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{rupee(s.amount)}</p>
                  <p className="text-xs">{String(s.paymentStatus)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      {isMaster && (
        <SectionCard title="Team performance">
          {team.isLoading ? (
            <DashSkeleton className="h-48" />
          ) : (team.data?.items.length ?? 0) === 0 ? (
            <EmptyNote text="No team activity." />
          ) : (
            <>
              <div className="mb-3 h-48">
                <ResponsiveContainer>
                  <BarChart
                    data={(team.data?.items ?? [])
                      .filter((t) => Number(t.tickets) > 0)
                      .slice(0, 10)
                      .map((t) => ({ name: String(t.name), tickets: Number(t.tickets) }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="tickets" fill="#f97316" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-sm">
                {team.data?.items.map((t) => (
                  <div
                    key={String(t.sellerId)}
                    className="flex justify-between rounded-lg border border-navy-700/10 px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold">
                        #{String(t.rank)} {String(t.name)}
                      </p>
                      <p className="text-xs text-navy-700/50">
                        {String(t.sellerCode)} · {String(t.status)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{num(t.tickets)} tix</p>
                      <p className="text-xs">{rupee(t.sales)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      )}
    </div>
  );
}

function FinRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-navy-700/5 py-1">
      <dt className="text-navy-700/55">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

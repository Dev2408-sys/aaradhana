import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

export function KpiCard({
  label,
  value,
  hint,
  tone,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'orange' | 'green' | 'red';
  children?: React.ReactNode;
}) {
  return (
    <Card className="space-y-1 p-3 sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-700/50">{label}</p>
      <p
        className={cn(
          'font-display text-xl font-bold sm:text-2xl',
          tone === 'orange' && 'text-orange-600',
          tone === 'green' && 'text-emerald-700',
          tone === 'red' && 'text-red-600',
          (!tone || tone === 'default') && 'text-navy-900',
        )}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-navy-700/55">{hint}</p>}
      {children}
    </Card>
  );
}

export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-700/10">
      <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-navy-900">{title}</h2>
          {subtitle && <p className="text-xs text-navy-700/55">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function DashSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-xl bg-navy-700/10', className ?? 'h-28')} />
  );
}

export function DashError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-700">
      <p>{message || 'Unable to load this section.'}</p>
      {onRetry && (
        <button type="button" className="mt-2 font-semibold text-orange-600" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyNote({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-navy-700/55">{text}</p>;
}

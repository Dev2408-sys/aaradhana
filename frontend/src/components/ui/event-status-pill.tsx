import { getEventLifecycle, suggestNavratriDay, type EventLifecycle } from '../../lib/navratri-days';
import { cn } from '../../lib/utils';

const LABELS: Record<EventLifecycle, string> = {
  UPCOMING: 'Upcoming',
  LIVE: 'Live now',
  COMPLETED: 'Completed',
};

export function EventStatusPill({
  lifecycle,
  className,
}: {
  lifecycle?: EventLifecycle;
  className?: string;
}) {
  const status = lifecycle ?? getEventLifecycle();
  const day = suggestNavratriDay();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
        status === 'LIVE' && 'bg-emerald-500/15 text-emerald-700',
        status === 'UPCOMING' && 'bg-orange-500/15 text-orange-700',
        status === 'COMPLETED' && 'bg-navy-700/10 text-navy-700',
        className,
      )}
    >
      {status === 'LIVE' && (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-kesariya-pulse" />
      )}
      {status === 'LIVE' && day ? `Day ${day} · Tonight` : LABELS[status]}
    </span>
  );
}

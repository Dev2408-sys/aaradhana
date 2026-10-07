import { getEventLifecycle, suggestNavratriDay, type EventLifecycle } from '../../lib/navratri-days';
import { cn } from '../../lib/utils';

const LABELS: Record<EventLifecycle, string> = {
  UPCOMING: 'Upcoming',
  LIVE: 'Live now',
  COMPLETED: 'Completed',
};

export function EventStatusPill({
  lifecycle,
  onDark,
  className,
}: {
  lifecycle?: EventLifecycle;
  /** Light styles for festive / dark headers */
  onDark?: boolean;
  className?: string;
}) {
  const status = lifecycle ?? getEventLifecycle();
  const day = suggestNavratriDay();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
        onDark
          ? 'border border-white/20 bg-white/12 text-amber-50 backdrop-blur-sm'
          : [
              status === 'LIVE' && 'bg-emerald-500/15 text-emerald-700',
              status === 'UPCOMING' && 'bg-orange-500/15 text-orange-700',
              status === 'COMPLETED' && 'bg-navy-700/10 text-navy-700',
            ],
        className,
      )}
    >
      {status === 'LIVE' && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full animate-kesariya-pulse',
            onDark ? 'bg-emerald-300' : 'bg-emerald-500',
          )}
        />
      )}
      {status === 'LIVE' && day ? `Day ${day} · Tonight` : LABELS[status]}
    </span>
  );
}

import { getNavratriDays } from '../../lib/navratri-days';
import { cn } from '../../lib/utils';

type Props = {
  value: number | '';
  onChange: (day: number | '') => void;
  className?: string;
  /** compact = Day 1 only; full = Day 1 — 11 Oct */
  variant?: 'compact' | 'full';
};

export function DayFilter({ value, onChange, className, variant = 'full' }: Props) {
  const days = getNavratriDays();

  return (
    <div
      className={cn(
        'flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange('')}
        className={cn(
          'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap',
          value === '' ? 'bg-navy-900 text-white' : 'bg-white text-navy-700',
        )}
      >
        All Days
      </button>
      {days.map((d) => {
        const label =
          variant === 'full'
            ? `Day ${d.day} — ${d.date.slice(8)} Oct`
            : d.shortLabel;
        return (
          <button
            key={d.day}
            type="button"
            onClick={() => onChange(d.day)}
            className={cn(
              'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap',
              value === d.day ? 'bg-orange-500 text-white' : 'bg-white text-navy-700',
            )}
            title={d.label}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

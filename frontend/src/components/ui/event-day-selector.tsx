import { getNavratriDays, suggestNavratriDay } from '../../lib/navratri-days';
import { cn } from '../../lib/utils';

type Props = {
  value: number | null | '';
  onChange: (day: number) => void;
  /** grid = 2-col mobile cards; chips = horizontal scroll */
  variant?: 'grid' | 'chips';
  className?: string;
  allowClear?: boolean;
  onClear?: () => void;
  disabledDays?: number[];
};

export function EventDaySelector({
  value,
  onChange,
  variant = 'grid',
  className,
  allowClear,
  onClear,
  disabledDays = [],
}: Props) {
  const days = getNavratriDays();
  const current = suggestNavratriDay();

  if (variant === 'chips') {
    return (
      <div className={cn('flex gap-2 overflow-x-auto pb-1 scrollbar-none', className)}>
        {allowClear && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              'shrink-0 rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold transition',
              value === '' || value == null
                ? 'bg-navy-900 text-white'
                : 'border border-navy-700/12 bg-white text-navy-700 hover:border-navy-700/25',
            )}
          >
            All days
          </button>
        )}
        {days.map((d) => {
          const selected = value === d.day;
          const disabled = disabledDays.includes(d.day);
          return (
            <button
              key={d.day}
              type="button"
              disabled={disabled}
              onClick={() => onChange(d.day)}
              className={cn(
                'shrink-0 rounded-[var(--radius-md)] px-3 py-2 text-left text-xs font-semibold transition disabled:opacity-40',
                selected
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'border border-navy-700/12 bg-white text-navy-800 hover:border-orange-300',
              )}
            >
              <span className="block font-display text-sm">Day {d.day}</span>
              <span className={cn('opacity-75', selected ? 'text-white' : 'text-navy-700/55')}>
                {d.calendarDay} {d.monthShort}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-5', className)}>
      {days.map((d) => {
        const selected = value === d.day;
        const isCurrent = current === d.day;
        const disabled = disabledDays.includes(d.day);
        return (
          <button
            key={d.day}
            type="button"
            disabled={disabled}
            onClick={() => onChange(d.day)}
            aria-pressed={selected}
            className={cn(
              'relative min-h-[4.5rem] rounded-[var(--radius-md)] border px-2 py-3 text-center transition disabled:opacity-40',
              selected
                ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                : 'border-navy-700/12 bg-white text-navy-800 hover:border-orange-300',
            )}
          >
            {isCurrent && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 animate-kesariya-pulse" />
            )}
            <span className="font-display block text-[15px] font-bold tracking-tight">
              DAY {d.day}
            </span>
            <span
              className={cn(
                'mt-0.5 block text-xs font-medium',
                selected ? 'text-orange-600/80' : 'text-navy-700/50',
              )}
            >
              {d.calendarDay} {d.monthShort}
            </span>
          </button>
        );
      })}
    </div>
  );
}

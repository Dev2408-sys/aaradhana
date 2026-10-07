import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  className,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)} aria-label={label}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-navy-900 text-white transition active:scale-95 disabled:opacity-35"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="font-display w-10 text-center text-2xl font-bold tabular-nums text-navy-900">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-orange-500 text-white transition active:scale-95 disabled:opacity-35"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

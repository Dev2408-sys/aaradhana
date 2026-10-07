import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export function IconBox({
  icon: Icon,
  tone = 'orange',
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  tone?: 'orange' | 'navy' | 'green' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)]',
        size === 'sm' && 'h-8 w-8',
        size === 'md' && 'h-10 w-10',
        size === 'lg' && 'h-12 w-12',
        tone === 'orange' && 'bg-orange-500/12 text-orange-600',
        tone === 'navy' && 'bg-navy-950 text-white',
        tone === 'green' && 'bg-emerald-500/12 text-emerald-700',
        tone === 'amber' && 'bg-amber-500/12 text-amber-700',
        className,
      )}
    >
      <Icon className={cn(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden />
    </span>
  );
}

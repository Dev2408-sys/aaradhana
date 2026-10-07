import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide',
  {
    variants: {
      tone: {
        navy: 'bg-navy-800/10 text-navy-800',
        orange: 'bg-orange-500/15 text-orange-700',
        green: 'bg-emerald-500/15 text-emerald-700',
        yellow: 'bg-amber-500/15 text-amber-800',
        red: 'bg-red-500/15 text-red-700',
        grey: 'bg-navy-700/10 text-navy-700/70',
        blue: 'bg-sky-500/15 text-sky-800',
      },
    },
    defaultVariants: { tone: 'navy' },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

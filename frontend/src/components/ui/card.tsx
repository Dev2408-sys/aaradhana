import * as React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-navy-700/10 bg-surface-elevated p-5 shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    />
  );
}

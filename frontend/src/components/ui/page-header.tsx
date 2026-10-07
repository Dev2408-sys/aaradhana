import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display mt-0.5 text-2xl font-bold leading-tight text-navy-900 sm:text-[1.75rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-xl text-sm text-navy-700/65">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-2', className)}>
      <div>
        <h2 className="font-display text-lg font-semibold text-navy-900 sm:text-xl">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-navy-700/55">{description}</p>}
      </div>
      {action}
    </div>
  );
}

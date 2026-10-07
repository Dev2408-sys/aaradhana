import type { ReactNode } from 'react';
import { EmptyGenericIllustration } from '../../assets/illustrations/EmptyGeneric';
import { cn } from '../../lib/utils';

export function EmptyState({
  title,
  description,
  action,
  illustration,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  illustration?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-navy-700/15 bg-white px-6 py-10 text-center',
        className,
      )}
    >
      <div className="mb-3 text-navy-700">
        {illustration ?? <EmptyGenericIllustration className="mx-auto h-20 w-28" />}
      </div>
      <p className="font-display text-base font-semibold text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-navy-700/60">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

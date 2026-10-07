import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again. If the problem continues, contact support.',
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-[var(--radius-lg)] border border-red-200 bg-red-50/60 px-6 py-8 text-center',
        className,
      )}
      role="alert"
    >
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
      <p className="font-display text-base font-semibold text-navy-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-navy-700/65">{description}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

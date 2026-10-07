import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-navy-700/8', className)}
      aria-hidden
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-navy-700/10 bg-white p-4 shadow-[var(--shadow-card)]">
      <Skeleton className="mb-3 h-4 w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

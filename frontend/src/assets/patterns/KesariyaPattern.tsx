import { cn } from '../../lib/utils';

/** Subtle Garba-inspired circular geometry for heroes and event cards. */
export function KesariyaPattern({
  className,
  opacity = 0.12,
}: {
  className?: string;
  opacity?: number;
}) {
  return (
    <svg
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ opacity }}
    >
      <defs>
        <pattern id="kesariya-rings" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="0.75" />
          <circle cx="60" cy="60" r="28" fill="none" stroke="currentColor" strokeWidth="0.6" />
          <circle cx="60" cy="60" r="8" fill="currentColor" />
          <circle cx="60" cy="12" r="1.5" fill="currentColor" />
          <circle cx="60" cy="108" r="1.5" fill="currentColor" />
          <circle cx="12" cy="60" r="1.5" fill="currentColor" />
          <circle cx="108" cy="60" r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kesariya-rings)" />
    </svg>
  );
}

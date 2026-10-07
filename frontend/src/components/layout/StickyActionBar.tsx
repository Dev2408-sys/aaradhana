import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/card';

/**
 * In-flow action footer — same Card width/padding as GOLD/VIP cards.
 * Never full-bleed gray slabs, never fixed overlay.
 */
export function StickyActionBar({
  children,
  className,
  meta,
}: {
  children: ReactNode;
  className?: string;
  meta?: ReactNode;
}) {
  return (
    <Card className={cn('p-4', className)}>
      {meta && (
        <>
          <div className="pb-3">{meta}</div>
          <div className="mb-3 border-t border-navy-700/10" />
        </>
      )}
      {children}
    </Card>
  );
}

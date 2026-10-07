import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

const sizes = {
  form: 'max-w-[640px]',
  sell: 'max-w-[760px]',
  support: 'max-w-[760px]',
  md: 'max-w-[900px]',
  sales: 'max-w-[1100px]',
  lg: 'max-w-[1200px]',
  fluid: 'max-w-none',
} as const;

export type PageContainerSize = keyof typeof sizes;

/** Page-specific content width. Always full-bleed on small phones (100% + padding). */
export function PageContainer({
  children,
  size = 'md',
  className,
}: {
  children: ReactNode;
  size?: PageContainerSize;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full px-4 sm:px-5', sizes[size], className)}>
      {children}
    </div>
  );
}

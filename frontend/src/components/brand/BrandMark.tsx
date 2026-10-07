import { Link } from 'react-router-dom';
import { BRAND } from '../../lib/brand';
import { cn } from '../../lib/utils';

type BrandMarkProps = {
  to?: string;
  /** light = on dark backgrounds */
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showGroup?: boolean;
  className?: string;
};

const logoSize = {
  sm: 'h-9 w-auto',
  md: 'h-12 w-auto',
  lg: 'h-16 w-auto sm:h-[4.5rem]',
} as const;

export function BrandMark({
  to = '/',
  tone = 'dark',
  size = 'md',
  showGroup = true,
  className,
}: BrandMarkProps) {
  const textMain = tone === 'light' ? 'text-white' : 'text-navy-900';
  const textMuted = tone === 'light' ? 'text-orange-300' : 'text-orange-600';
  const textSoft = tone === 'light' ? 'text-white/65' : 'text-navy-700/60';

  const aaradhanaSize =
    size === 'lg' ? 'h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]' : size === 'md' ? 'h-12 w-12' : 'h-9 w-9';

  const inner = (
    <>
      <img
        src={BRAND.logoSrc}
        alt={BRAND.eventFull}
        className={cn(logoSize[size], 'shrink-0 object-contain')}
      />
      <span
        className={cn(
          'h-8 w-px shrink-0 self-center',
          tone === 'light' ? 'bg-[#F6C243]/45' : 'bg-navy-700/20',
        )}
        aria-hidden
      />
      <img
        src={BRAND.aaradhanaLogoSrc}
        alt={BRAND.group}
        className={cn(
          aaradhanaSize,
          'shrink-0 rounded-full object-cover ring-1',
          tone === 'light' ? 'ring-[#F6C243]/45' : 'ring-navy-700/15',
        )}
      />
      <span className="min-w-0 text-left">
        <span
          className={cn(
            'block text-[10px] font-semibold uppercase tracking-[0.18em]',
            textMuted,
          )}
        >
          {BRAND.eventFull}
        </span>
        {showGroup && (
          <span className={cn('mt-0.5 block font-display text-sm font-semibold sm:text-base', textMain)}>
            {BRAND.group}
          </span>
        )}
        <span className={cn('mt-0.5 block text-[11px] font-medium', textSoft)}>Seller OS</span>
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cn('inline-flex items-center gap-3', className)}>
        {inner}
      </Link>
    );
  }

  return <div className={cn('inline-flex items-center gap-3', className)}>{inner}</div>;
}

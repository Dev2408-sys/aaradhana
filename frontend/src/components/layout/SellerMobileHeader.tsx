import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { getGreeting } from '../../lib/navratri-days';
import { EventStatusPill } from '../ui/event-status-pill';

export function SellerMobileHeader({
  title,
  subtitle,
  showBack,
  backTo = '/seller',
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
  action?: ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-navy-700/10 bg-white/95 backdrop-blur-md',
        'pt-[env(safe-area-inset-top)]',
        className,
      )}
    >
      <div className="mx-auto flex min-h-14 w-full max-w-[1100px] items-center gap-2 px-3 sm:px-4">
        {showBack ? (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-navy-800 transition hover:bg-navy-800/5"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
          </button>
        ) : (
          <span className="w-2" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-[1.125rem] font-bold leading-tight text-navy-900 sm:text-xl">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-navy-700/55">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export function SellerHomeHeader({
  firstName,
  className,
}: {
  firstName: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'border-b border-navy-700/8 bg-white/90 backdrop-blur-md',
        'pt-[max(0.75rem,env(safe-area-inset-top))]',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-4 sm:px-5">
        <p className="text-sm text-navy-700/60">
          {getGreeting()},{' '}
          <span className="font-semibold text-navy-900">{firstName}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy-900">
            Kesariya 4.0
          </h1>
          <EventStatusPill />
        </div>
        <p className="mt-1 text-sm text-navy-700/55">11–20 Oct 2026 · Surat</p>
      </div>
    </header>
  );
}

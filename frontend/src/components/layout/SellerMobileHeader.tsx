import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import { BRAND } from '../../lib/brand';
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
        'relative overflow-hidden bg-[#2a1050] text-white',
        'pt-[max(0.5rem,env(safe-area-inset-top))]',
        className,
      )}
    >
      {/* Greeting strip — keeps faces clear below */}
      <div className="relative z-20 mx-auto flex w-full max-w-[1100px] items-center justify-between gap-2 px-4 pb-1.5 pt-1 sm:px-5">
        <p className="text-[12px] tracking-wide text-white/80">
          {getGreeting()},{' '}
          <span className="font-semibold text-amber-200">{firstName}</span>
        </p>
        <EventStatusPill onDark />
      </div>

      {/* Full artwork — no crop so artist faces stay visible */}
      <div className="relative mx-auto w-full max-w-[720px]">
        <img
          src={BRAND.eventBannerSrc}
          alt=""
          className="block w-full select-none"
          draggable={false}
        />

        {/* Soft center scrim only — sides stay open for faces */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 52% 68% at 50% 42%, rgba(18,6,31,0.72) 0%, rgba(18,6,31,0.45) 45%, rgba(18,6,31,0.08) 72%, transparent 86%)',
          }}
          aria-hidden
        />

        <div className="absolute inset-0 flex items-center justify-center px-10 sm:px-16">
          <div className="max-w-[16rem] text-center sm:max-w-[18rem]">
            <div className="mx-auto flex items-center justify-center gap-2.5">
              <img
                src={BRAND.logoSrc}
                alt={BRAND.eventFull}
                className="h-9 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:h-10"
              />
              <span className="h-7 w-px bg-amber-200/40" aria-hidden />
              <img
                src={BRAND.aaradhanaLogoSrc}
                alt={BRAND.group}
                className="h-8 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:h-9"
              />
            </div>

            <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.26em] text-amber-300">
              Seller desk
            </p>
            <h1 className="font-display mt-0.5 text-[1.35rem] font-bold leading-[1.15] tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:text-2xl">
              {BRAND.eventFull}
            </h1>
            <p className="mt-0.5 text-xs font-medium text-amber-100/95">{BRAND.group}</p>

            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-white/90">
              <MapPin className="h-3 w-3 shrink-0 text-amber-300" aria-hidden />
              <span className="truncate">
                {BRAND.venue} · {BRAND.city}
              </span>
            </p>
            <p className="mt-0.5 text-[10px] tracking-wide text-white/70">{BRAND.datesShort}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

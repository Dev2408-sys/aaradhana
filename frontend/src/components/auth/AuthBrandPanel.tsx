import { Link } from 'react-router-dom';
import { BRAND } from '../../lib/brand';

export function AuthBrandPanel({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <aside className="relative hidden min-h-full overflow-hidden bg-[#1B0A3C] text-[#FFF4E2] lg:flex lg:flex-col">
      <div className="absolute inset-0">
        <img
          src="/landing/hero-1920.jpg"
          alt=""
          className="h-full w-full object-cover object-[center_18%]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#1B0A3C]/70 via-[#2E0F63]/50 to-[#1B0A3C]"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-[#1B0A3C] via-[#1B0A3C]/95 to-transparent"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex min-h-[min(100vh,960px)] flex-1 flex-col justify-between px-10 py-12 xl:px-14 xl:py-14">
        {/* Dual logos — Kesariya + Aaradhana */}
        <Link to="/" className="group inline-flex flex-col gap-4">
          <div className="flex items-center gap-4 xl:gap-5">
            <img
              src={BRAND.logoSrc}
              alt={BRAND.eventFull}
              className="h-[5.25rem] w-auto drop-shadow-[0_10px_28px_rgba(0,0,0,0.4)] transition duration-300 group-hover:scale-[1.02] xl:h-28"
            />
            <span
              className="h-14 w-px shrink-0 bg-gradient-to-b from-transparent via-[#F6C243]/70 to-transparent xl:h-16"
              aria-hidden
            />
            <img
              src={BRAND.aaradhanaLogoSrc}
              alt={BRAND.group}
              className="h-[5.25rem] w-auto rounded-full drop-shadow-[0_10px_28px_rgba(0,0,0,0.4)] ring-2 ring-[#F6C243]/45 transition duration-300 group-hover:scale-[1.02] xl:h-28"
            />
          </div>
          <div>
            <p className="font-display text-xl font-bold tracking-tight text-white xl:text-2xl">
              {BRAND.eventFull}
            </p>
            <p className="mt-1 text-sm font-semibold tracking-[0.04em] text-[#F6C243]">
              {BRAND.group}
            </p>
          </div>
        </Link>

        <div className="max-w-md space-y-4">
          <div className="h-1 w-14 rounded-full bg-gradient-to-r from-[#F6C243] to-[#F0801A]" />
          <h1 className="font-display text-4xl font-bold leading-[1.05] text-white xl:text-5xl">
            {title}
          </h1>
          <p className="text-base leading-relaxed text-[#FFF4E2]/80 xl:text-[1.05rem]">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F6C243]/80">
              Dates
            </p>
            <p className="mt-1.5 text-sm font-semibold text-white">11–20 Oct 2026</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F6C243]/80">
              Venue
            </p>
            <p className="mt-1.5 text-sm font-semibold text-white">Kesariya AC Dome</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F6C243]/80">
              City
            </p>
            <p className="mt-1.5 text-sm font-semibold text-white">Vesu, Surat</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

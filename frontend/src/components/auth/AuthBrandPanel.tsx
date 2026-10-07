import { Link } from 'react-router-dom';
import { KesariyaPattern } from '../../assets/patterns/KesariyaPattern';
import { EventStatusPill } from '../ui/event-status-pill';

export function AuthBrandPanel({
  eyebrow = 'Kesariya Navratri 4.0',
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative overflow-hidden bg-navy-950 px-6 py-10 text-white sm:px-10 sm:py-14 lg:min-h-full lg:px-12 lg:py-16">
      <KesariyaPattern className="text-white" opacity={0.09} />
      <div
        className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-orange-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto flex h-full max-w-lg flex-col justify-between gap-10 lg:mx-0">
        <div className="flex items-start justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-orange-500 font-display text-lg font-bold text-white">
              K4
            </span>
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
                {eyebrow}
              </span>
              <span className="font-display text-lg font-semibold">Seller OS</span>
            </span>
          </Link>
          <EventStatusPill className="bg-white/10 text-orange-300" />
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-md text-base text-white/70">{subtitle}</p>
        </div>

        <dl className="grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-sm">
          <div>
            <dt className="text-white/45">Event</dt>
            <dd className="mt-1 font-semibold">11–20 Oct</dd>
          </div>
          <div>
            <dt className="text-white/45">Venue</dt>
            <dd className="mt-1 font-semibold">AC Dome</dd>
          </div>
          <div>
            <dt className="text-white/45">City</dt>
            <dd className="mt-1 font-semibold">Surat</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

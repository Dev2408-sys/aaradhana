import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Ticket } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { EventStatusPill } from '../components/ui/event-status-pill';
import { KesariyaPattern } from '../assets/patterns/KesariyaPattern';

export function HomePage() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <KesariyaPattern className="text-white" opacity={0.08} />
        <div
          className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-orange-500/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-orange-400/10 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-[min(92vh,820px)] max-w-6xl flex-col justify-between px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-orange-500 font-display text-lg font-bold">
                K4
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-400">
                  Official seller network
                </p>
                <p className="font-display text-sm font-semibold">Kesariya 4.0</p>
              </div>
            </div>
            <EventStatusPill className="bg-white/10 text-orange-300" />
          </div>

          <div className="max-w-2xl py-12 lg:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">
              11–20 October 2026 · Surat
            </p>
            <h1 className="font-display mt-4 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Kesariya Navratri 4.0
            </h1>
            <p className="mt-5 max-w-lg text-base text-white/70 sm:text-lg">
              Premium Garba nights at Kesariya AC Dome. Sellers book Gold & VIP tickets, settle
              admin base, and deliver a polished guest experience.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/login" className="block sm:w-auto">
                <Button size="xl" className="w-full sm:w-auto">
                  <Ticket className="h-5 w-5" aria-hidden />
                  Get tickets
                </Button>
              </Link>
              <Link to="/login" className="block sm:w-auto">
                <Button
                  size="xl"
                  variant="outline"
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
                >
                  Become a seller
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm">
            <div>
              <p className="text-white/45">Dates</p>
              <p className="mt-1 font-semibold">11–20 Oct</p>
            </div>
            <div>
              <p className="text-white/45">Venue</p>
              <p className="mt-1 flex items-center gap-1 font-semibold">
                <MapPin className="h-3.5 w-3.5 text-orange-400" aria-hidden />
                AC Dome
              </p>
            </div>
            <div>
              <p className="text-white/45">City</p>
              <p className="mt-1 font-semibold">Vesu, Surat</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-navy-900">Seller access</h2>
        <p className="mt-1 text-sm text-navy-700/65">
          Existing sellers sign in. New sellers join with a master invite code.
        </p>

        <Link to="/login" className="mt-6 block">
          <Button className="w-full" size="lg">
            Seller / Admin sign in
          </Button>
        </Link>

        <div className="mt-5 rounded-[var(--radius-lg)] border border-navy-700/10 bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="font-display font-semibold text-navy-900">Join as a new seller</p>
          <p className="mt-1 text-xs text-navy-700/60">
            Ask your master seller for their code, then complete your profile.
          </p>
          <div className="mt-4 flex gap-2">
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Invite code"
              className="font-mono uppercase"
              aria-label="Seller invite code"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={inviteCode.trim().length < 3}
              onClick={() => navigate(`/seller/join/${inviteCode.trim()}`)}
            >
              Continue
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

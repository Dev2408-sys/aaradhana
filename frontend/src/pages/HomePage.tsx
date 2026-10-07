import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../lib/brand';
import './HomePage.css';

const EVENT_START = new Date('2026-10-11T19:00:00+05:30').getTime();
const MAPS_URL =
  'https://www.google.com/maps/place/Bhagwan+Mahavir+University/@21.1401463,72.7941876,17z';
const MAP_EMBED =
  'https://maps.google.com/maps?q=21.1401463,72.7941876&t=&z=17&ie=UTF8&iwloc=&output=embed';

const ARTISTS = [
  {
    name: 'Rutvi Pandya',
    role: 'Playback singer & garba performer',
    src: '/landing/artist-rutvi.jpg',
  },
  {
    name: 'Rajesh Ahir',
    role: 'Folk & garba vocalist',
    src: '/landing/artist-rajesh.jpg',
  },
  {
    name: 'Aastha Patel',
    role: 'Gujarati folk singer',
    src: '/landing/artist-aastha.jpg',
  },
  {
    name: 'Nirav Barot',
    role: 'Garba & folk vocalist',
    src: '/landing/artist-nirav.jpg',
  },
] as const;

const HIGHLIGHTS = [
  {
    title: 'Fully AC Dome',
    body: 'A proper climate-controlled dome — dance all night without the sweat and dust of an open ground.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 3v18M3 12h18M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7" />
      </svg>
    ),
  },
  {
    title: 'Live Orchestra',
    body: 'Full live band and singers every single night. Traditional sanedo to the latest garba chartbusters.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    title: '10 Full Nights',
    body: '11 October to 20 October. Season passes and single-night passes both available on the booking page.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    ),
  },
  {
    title: 'Food & Beverage Court',
    body: 'Curated Surti food stalls, chaas counters and dessert corners right inside the venue.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M3 11h18M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M6 11v8M18 11v8" />
      </svg>
    ),
  },
  {
    title: 'Ample Parking',
    body: 'Dedicated two-wheeler and four-wheeler parking with marshals on duty till the last garba.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M5 17h14M7 17V9l2-4h6l2 4v8" />
        <circle cx="8" cy="19" r="2" />
        <circle cx="16" cy="19" r="2" />
      </svg>
    ),
  },
  {
    title: 'Safe & Secure',
    body: "Trained bouncers, CCTV coverage, separate ladies' facilities and on-site medical support.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6z" />
        <path d="M9.5 12.5l1.8 1.8 3.4-3.6" />
      </svg>
    ),
  },
] as const;

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, '0');
}

function useCountdown(targetMs: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, targetMs - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll('.landing-reveal');
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
}

export function HomePage() {
  const clock = useCountdown(EVENT_START);
  const [scrolled, setScrolled] = useState(false);
  useReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing">
      <header className={`landing-header${scrolled ? ' scrolled' : ''}`} id="top">
        <div className="wrap landing-nav">
          <a
            className="landing-nav__brand"
            href="#top"
            aria-label="Kesariya Navratri 4.0 · Aaradhana Group home"
          >
            <img
              src="/landing/logo-kesariya.png"
              alt="Kesariya Navratri 4.0"
              width={160}
              height={46}
            />
            <span className="landing-nav__divider" aria-hidden />
            <img
              src="/landing/logo-aaradhana.png"
              alt="Aaradhana Group"
              className="landing-nav__aaradhana"
              width={46}
              height={46}
            />
            <span className="landing-nav__group">Aaradhana Group</span>
          </a>
          <nav className="landing-nav__links" aria-label="Main">
            <a href="#highlights">Highlights</a>
            <a href="#artists">Artists</a>
            <a href="#venue">Venue</a>
            <a href="#contact">Contact</a>
          </nav>
          <Link className="btn btn--sm" to="/login">
            <span className="dot" aria-hidden />
            Become a Seller
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-label="Kesariya Navratri 4.0" style={{ padding: 0 }}>
          <div className="landing-hero__media">
            <picture>
              <source media="(max-width:480px)" srcSet="/landing/hero-mobile.jpg" />
              <source media="(max-width:1024px)" srcSet="/landing/hero-1024.jpg" />
              <img
                src="/landing/hero-1920.jpg"
                width={1920}
                height={1080}
                alt="Kesariya Navratri 4.0 — Rutvi Pandya, Rajesh Ahir and Aastha Patel at Kesariya AC Dome, Vesu, Surat"
                fetchPriority="high"
              />
            </picture>
          </div>

          <div className="landing-hero__below">
            <div className="wrap">
              <span className="landing-hero__kicker">Organized by HEMZ &amp; Co.</span>
              <h1 className="display landing-hero__title">
                Surat&apos;s Biggest <span>AC Dome</span> Garba is Back
              </h1>
              <p className="landing-hero__sub">
                Ten nights of non-stop garba with Rutvi Pandya, Rajesh Ahir, Aastha Patel and Nirav
                Barot — live at Kesariya AC Dome, Vesu. Limited passes per night.
              </p>
              <div className="landing-hero__cta">
                <Link className="btn" to="/login">
                  <span className="dot" aria-hidden />
                  Become a Seller Now
                </Link>
                <a className="btn btn--ghost" href="#venue">
                  Get Directions
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="landing-facts">
          <div className="landing-facts__inner wrap">
            <span>
              <b>11 Oct – 20 Oct</b> · 10 Nights
            </span>
            <span>
              <b>Kesariya AC Dome</b> · Vesu, Surat
            </span>
            <span>
              <b>Live Orchestra</b> · Every Night
            </span>
          </div>
        </div>

        <section className="landing-countdown landing-reveal">
          <div className="wrap">
            <h2 className="display">Garba starts in</h2>
            <div className="landing-clock" role="timer" aria-live="off">
              <div className="landing-clock__cell">
                <div className="landing-clock__num">{pad(clock.days)}</div>
                <div className="landing-clock__lab">Days</div>
              </div>
              <div className="landing-clock__cell">
                <div className="landing-clock__num">{pad(clock.hours)}</div>
                <div className="landing-clock__lab">Hours</div>
              </div>
              <div className="landing-clock__cell">
                <div className="landing-clock__num">{pad(clock.minutes)}</div>
                <div className="landing-clock__lab">Minutes</div>
              </div>
              <div className="landing-clock__cell">
                <div className="landing-clock__num">{pad(clock.seconds)}</div>
                <div className="landing-clock__lab">Seconds</div>
              </div>
            </div>
          </div>
        </section>

        <section id="highlights">
          <div className="wrap">
            <div className="landing-sec-head landing-reveal">
              <span className="landing-eyebrow">Why Kesariya 4.0 · Aaradhana Group</span>
              <h2 className="display">Built for the best ten nights of your year</h2>
              <div className="landing-rule" />
            </div>
            <div className="landing-grid-3">
              {HIGHLIGHTS.map((h) => (
                <div className="landing-card landing-reveal" key={h.title}>
                  <div className="landing-card__icon">{h.icon}</div>
                  <h3>{h.title}</h3>
                  <p>{h.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="artists" className="landing-artists-section">
          <div className="wrap">
            <div className="landing-sec-head landing-reveal">
              <span className="landing-eyebrow">Live Performing · 11 Oct to 20 Oct</span>
              <h2 className="display">The voices of Kesariya 4.0 · Aaradhana Group</h2>
              <p>Gujarat&apos;s most-loved garba performers, on one stage, for ten straight nights.</p>
              <div className="landing-rule" />
            </div>
            <div className="landing-artists">
              {ARTISTS.map((a) => (
                <div className="landing-artist landing-reveal" key={a.name}>
                  <div className="landing-artist__frame">
                    <img src={a.src} alt={a.name} loading="lazy" width={560} height={560} />
                    <span className="landing-artist__tag">Live Vocals</span>
                  </div>
                  <h3>{a.name}</h3>
                  <p>{a.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="venue">
          <div className="wrap">
            <div className="landing-sec-head landing-reveal">
              <span className="landing-eyebrow">The Venue</span>
              <h2 className="display">Kesariya AC Dome, Vesu</h2>
              <div className="landing-rule" />
            </div>

            <div className="landing-venue">
              <div className="landing-venue__card landing-reveal">
                <h3>Kesariya AC Dome</h3>
                <address>
                  Opp. Bhagwan Mahavir College,
                  <br />
                  VIP Road, Vesu,
                  <br />
                  Surat, Gujarat
                </address>
                <ul className="landing-venue__list">
                  <li>
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M16 3v4M8 3v4M3 11h18" />
                    </svg>
                    <span>
                      <strong>11 Oct – 20 Oct 2026</strong> · all ten nights
                    </span>
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    <span>
                      Gates open <strong>7:00 PM</strong> · Garba from <strong>8:30 PM</strong>
                    </span>
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path d="M5 17h14M7 17V9l2-4h6l2 4v8" />
                      <circle cx="8" cy="19" r="2" />
                      <circle cx="16" cy="19" r="2" />
                    </svg>
                    <span>On-site parking for cars &amp; two-wheelers</span>
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>Landmark: opposite Bhagwan Mahavir College, VIP Road</span>
                  </li>
                </ul>
                <div className="landing-hero__cta" style={{ justifyContent: 'flex-start' }}>
                  <a className="btn" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
                    Open in Google Maps
                  </a>
                  <Link className="btn btn--ghost" to="/login">
                    Become a Seller
                  </Link>
                </div>
              </div>

              <div className="landing-map landing-reveal">
                <iframe
                  title="Map to Kesariya AC Dome, Vesu, Surat"
                  src={MAP_EMBED}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>

        <section style={{ paddingTop: 10 }}>
          <div className="wrap">
            <div className="landing-band landing-reveal">
              <h2>Join the seller network. Sell every night.</h2>
              <p>
                Become a Kesariya seller with Aaradhana Group — book Gold &amp; VIP tickets for your
                guests, and grow with the biggest AC dome garba in Surat.
              </p>
              <div className="landing-hero__cta">
                <Link className="btn" to="/login">
                  <span className="dot" aria-hidden />
                  Become a Seller Now
                </Link>
                <a className="btn btn--ghost" href={`tel:${BRAND.supportPhoneTel}`}>
                  Call · {BRAND.supportPhoneDisplay}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer" id="contact">
        <div className="wrap">
          <div className="landing-foot">
            <div className="landing-foot__brand">
              <div className="landing-foot__logos">
                <img src="/landing/logo-kesariya.png" alt="Kesariya Navratri 4.0" width={140} height={76} />
                <img
                  src="/landing/logo-aaradhana.png"
                  alt="Aaradhana Group"
                  className="landing-foot__aaradhana"
                  width={72}
                  height={72}
                />
              </div>
              <p>
                Kesariya Navratri 4.0 · Aaradhana Group — Surat&apos;s biggest AC dome garba,
                organized by HEMZ &amp; Co.
              </p>
              <div className="landing-socials">
                <a
                  href={BRAND.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3zm6.9-11.1a1.55 1.55 0 1 1-1.55-1.55A1.55 1.55 0 0 1 18.9 5.2z" />
                  </svg>
                </a>
                <a
                  href={`https://wa.me/${BRAND.supportWhatsApp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                >
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.6 14.1c-.2.7-1.4 1.3-2 1.4-.5 0-1.1.2-3.6-.8-3-1.3-4.9-4.4-5-4.6-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.3.3c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.4.1.6-.1l.9-1c.2-.2.4-.2.6-.1l2 1c.2.1.4.2.4.3.1.1.1.6-.1 1.3z" />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h4>Event</h4>
              <p>
                <a href="#highlights">Highlights</a>
                <br />
                <a href="#artists">Artists</a>
                <br />
                <a href="#venue">Venue &amp; Directions</a>
                <br />
                <Link to="/login">Become a Seller</Link>
                <br />
                <Link to="/login">Seller / Admin login</Link>
              </p>
            </div>

            <div>
              <h4>Contact</h4>
              <p>
                Seller support &amp; enquiries
                <br />
                <a href={`tel:${BRAND.supportPhoneTel}`}>{BRAND.supportPhoneDisplay}</a>
                <br />
                <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>
                <br />
                <a href={BRAND.instagramUrl} target="_blank" rel="noopener noreferrer">
                  @{BRAND.instagramHandle}
                </a>
              </p>
            </div>
          </div>

          <div className="landing-colophon">
            <span>
              © 2026 HEMZ &amp; Co. · Kesariya Navratri 4.0 · Aaradhana Group. All rights reserved.
            </span>
            <span>Seller network · aaradhana.khodi.in</span>
          </div>
        </div>
      </footer>

      <div className="landing-sticky">
        <div className="meta">
          <b>11 Oct – 20 Oct</b>
          <span>Kesariya AC Dome, Vesu</span>
        </div>
        <Link className="btn btn--sm" to="/login">
          <span className="dot" aria-hidden />
          Become a Seller
        </Link>
      </div>
    </div>
  );
}

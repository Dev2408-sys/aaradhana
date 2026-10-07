import { useQuery } from '@tanstack/react-query';
import {
  Check,
  CreditCard,
  Headphones,
  MessageCircle,
  Ticket,
  UserRound,
} from 'lucide-react';
import { getMySeller } from '../../api/sellers';
import { getPaymentSettings } from '../../api/pricing';
import { getErrorMessage } from '../../api/client';
import { Card } from '../../components/ui/card';
import { ErrorState } from '../../components/ui/error-state';
import { IconBox } from '../../components/ui/icon-box';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/utils';

function formatWhatsAppDisplay(raw?: string | null) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return `+${digits}`;
}

const TIPS = [
  'Keep your Sale Number ready.',
  'Keep your payment screenshot ready if applicable.',
  'Mention the issue clearly.',
  'Do not share passwords or OTPs.',
];

const CATEGORIES = [
  {
    icon: Ticket,
    title: 'Booking Help',
    blurb: 'Day, tickets, customer details',
  },
  {
    icon: CreditCard,
    title: 'Payment Help',
    blurb: 'UPI, QR, screenshot upload',
  },
  {
    icon: Headphones,
    title: 'Ticket Help',
    blurb: 'Numbers, delivery, confirmation',
  },
  {
    icon: UserRound,
    title: 'Account Help',
    blurb: 'Profile, password, activation',
  },
];

export function SellerSupportPage() {
  const meQuery = useQuery({ queryKey: ['sellers-me'], queryFn: getMySeller });
  const supportQuery = useQuery({
    queryKey: ['payment-settings'],
    queryFn: () => getPaymentSettings(),
  });

  const wa = supportQuery.data?.supportWhatsapp;
  const me = meQuery.data;
  const display = formatWhatsAppDisplay(wa);
  const message = [
    'Hello Kesariya support,',
    '',
    `Seller: ${me?.name ?? ''} (${me?.sellerCode ?? ''})`,
    `Mobile: ${me?.mobile ?? ''}`,
    '',
    'I need help with:',
    '- Ticket confirmation',
    '- Booking / customer details',
    '',
    'Thank you.',
  ].join('\n');

  const link = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(message)}` : null;

  return (
    <div className="animate-kesariya-in space-y-4 pb-2">
      <Card className="flex items-start gap-3 border-navy-700/10 p-4">
        <IconBox icon={Headphones} tone="orange" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-600">
            Need help?
          </p>
          <p className="mt-1 text-sm text-navy-700/70">
            Having trouble with your booking or ticket? Reach our WhatsApp desk.
          </p>
        </div>
      </Card>

      {supportQuery.isLoading && <Skeleton className="h-52 w-full rounded-[var(--radius-lg)]" />}
      {supportQuery.error && (
        <ErrorState
          description={getErrorMessage(supportQuery.error)}
          onRetry={() => void supportQuery.refetch()}
        />
      )}

      {!supportQuery.isLoading && !supportQuery.error && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] bg-navy-950 text-white shadow-[var(--shadow-elevated)]">
          <div className="relative p-5">
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-orange-500/25 blur-3xl"
              aria-hidden
            />
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                <MessageCircle className="h-5 w-5 text-[#25D366]" aria-hidden />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  WhatsApp support
                </p>
                <p className="font-display mt-0.5 text-xl font-semibold">
                  {display ?? 'Number not set'}
                </p>
              </div>
            </div>
            <p className="relative mt-3 text-sm text-white/65">
              Use this for ticket confirmation follow-ups and booking corrections.
            </p>
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'relative mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)]',
                  'bg-[#25D366] text-sm font-bold text-white shadow-md transition hover:bg-[#1ebe57] active:scale-[0.98]',
                )}
              >
                <MessageCircle className="h-5 w-5" aria-hidden />
                Message on WhatsApp
              </a>
            ) : (
              <p className="relative mt-4 text-sm text-orange-300">
                Admin has not configured support WhatsApp yet.
              </p>
            )}
          </div>
        </div>
      )}

      <Card className="space-y-3 p-4">
        <p className="font-display text-base font-semibold text-navy-900">Before you message</p>
        <ul className="space-y-2.5">
          {TIPS.map((tip) => (
            <li key={tip} className="flex items-start gap-2.5 text-sm text-navy-700/75">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </Card>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-700/45">
          Common topics
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="rounded-[var(--radius-md)] border border-navy-700/10 bg-white p-3 shadow-[var(--shadow-card)]"
              >
                <Icon className="h-4 w-4 text-orange-500" aria-hidden />
                <p className="mt-2 text-sm font-semibold text-navy-900">{c.title}</p>
                <p className="mt-0.5 text-[11px] text-navy-700/50">{c.blurb}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-navy-700/45">
          Mention the topic in your WhatsApp message for faster help.
        </p>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Copy, ExternalLink, IndianRupee, QrCode, Ticket } from 'lucide-react';
import { createSale, fetchTicketTypes, searchCustomers, type SaleSummary } from '../../api/sales';
import { getPaymentSettings } from '../../api/pricing';
import { uploadPaymentProof } from '../../api/uploads';
import { getErrorMessage } from '../../api/client';
import { SuccessTicketIllustration } from '../../assets/illustrations/SuccessTicket';
import { StickyActionBar } from '../../components/layout/StickyActionBar';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { EventDaySelector } from '../../components/ui/event-day-selector';
import { QuantityStepper } from '../../components/ui/quantity-stepper';
import { PaymentProofUploader } from '../../components/ui/payment-proof-uploader';
import { StatusBadge } from '../../components/ui/status-badge';
import { getNavratriDays, suggestNavratriDay } from '../../lib/navratri-days';
import { mediaUrl } from '../../lib/uploads';
import { cn } from '../../lib/utils';

function rupee(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

const STEPS = [
  { id: 1, label: 'Day' },
  { id: 2, label: 'Tickets' },
  { id: 3, label: 'Customer' },
  { id: 4, label: 'Payment' },
  { id: 5, label: 'Submit' },
] as const;

export function SellerSellPage() {
  const navigate = useNavigate();
  const typesQuery = useQuery({ queryKey: ['ticket-types'], queryFn: fetchTicketTypes });
  const days = getNavratriDays();
  const [step, setStep] = useState(1);
  const [eventDay, setEventDay] = useState<number>(suggestNavratriDay() ?? 1);
  const [goldQty, setGoldQty] = useState(0);
  const [vipQty, setVipQty] = useState(0);
  const [goldPrice, setGoldPrice] = useState('799');
  const [vipPrice, setVipPrice] = useState('999');
  const [customer, setCustomer] = useState({ name: '', mobile: '', email: '' });
  const [existingNote, setExistingNote] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SaleSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const suggested = typesQuery.data?.event.suggestedDay;
    if (suggested) setEventDay(suggested);
  }, [typesQuery.data?.event.suggestedDay]);

  const gold = typesQuery.data?.ticketTypes.find((t) => t.code === 'GOLD');
  const vip = typesQuery.data?.ticketTypes.find((t) => t.code === 'VIP');

  const goldDay = gold?.dayPricing?.find((d) => d.dayNumber === eventDay);
  const vipDay = vip?.dayPricing?.find((d) => d.dayNumber === eventDay);
  const goldBase = Number(goldDay?.basePrice ?? gold?.basePrice ?? 400);
  const vipBase = Number(vipDay?.basePrice ?? vip?.basePrice ?? 400);
  const goldMin = Number(goldDay?.minimumSellingPrice ?? goldBase);
  const vipMin = Number(vipDay?.minimumSellingPrice ?? vipBase);
  const goldSuggested = Number(goldDay?.suggestedSellingPrice ?? goldPrice);
  const vipSuggested = Number(vipDay?.suggestedSellingPrice ?? vipPrice);

  useEffect(() => {
    if (goldDay?.suggestedSellingPrice) {
      setGoldPrice(String(goldDay.suggestedSellingPrice));
    }
    if (vipDay?.suggestedSellingPrice) {
      setVipPrice(String(vipDay.suggestedSellingPrice));
    }
  }, [eventDay, goldDay?.suggestedSellingPrice, vipDay?.suggestedSellingPrice]);

  const summary = useMemo(() => {
    const gPrice = Number(goldPrice) || 0;
    const vPrice = Number(vipPrice) || 0;
    const customerTotal = goldQty * gPrice + vipQty * vPrice;
    const baseAmount = goldQty * goldBase + vipQty * vipBase;
    return {
      customerTotal,
      baseAmount,
      margin: customerTotal - baseAmount,
      qty: goldQty + vipQty,
      goldPriceError: goldQty > 0 && gPrice < goldMin,
      vipPriceError: vipQty > 0 && vPrice < vipMin,
    };
  }, [goldQty, vipQty, goldPrice, vipPrice, goldBase, vipBase, goldMin, vipMin]);

  const upiQuery = useQuery({
    queryKey: ['payment-settings', summary.baseAmount],
    queryFn: () => getPaymentSettings(summary.baseAmount > 0 ? summary.baseAmount : undefined),
  });

  const onProofSelected = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const local = URL.createObjectURL(file);
      setProofPreview(local);
      const uploaded = await uploadPaymentProof(file);
      setProofUrl(uploaded.url);
    } catch (err) {
      setProofUrl(null);
      setProofPreview(null);
      setError(err instanceof Error ? err.message : 'Screenshot upload failed');
    } finally {
      setUploading(false);
    }
  };

  const clearProof = () => {
    setProofUrl(null);
    setProofPreview(null);
  };

  const lookupCustomer = async (mobile: string) => {
    setCustomer((c) => ({ ...c, mobile }));
    if (mobile.replace(/\D/g, '').length < 10) {
      setExistingNote(null);
      return;
    }
    try {
      const result = await searchCustomers(mobile);
      const match = result.items[0];
      if (match) {
        setExistingNote(match.name);
        setCustomer((c) => ({ ...c, name: c.name || match.name, mobile: match.mobile }));
      } else {
        setExistingNote(null);
      }
    } catch {
      setExistingNote(null);
    }
  };

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: (data) => {
      setSuccess(data);
      setError(null);
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Sale could not be completed. No tickets were issued.'));
    },
  });

  const confirm = () => {
    setError(null);
    if (!gold || !vip) {
      setError('Ticket types failed to load');
      return;
    }
    if (!eventDay || eventDay < 1 || eventDay > 10) {
      setError('Select Navratri day (Day 1–10)');
      return;
    }
    if (summary.qty < 1) {
      setError('Select at least one ticket');
      return;
    }
    if (summary.goldPriceError || summary.vipPriceError) {
      setError('Selling price is below the minimum allowed');
      return;
    }
    if (!customer.name.trim() || customer.mobile.replace(/\D/g, '').length < 10) {
      setError('Customer name and valid mobile are required');
      return;
    }
    if (!proofUrl) {
      setError('Pay admin UPI and upload payment screenshot first');
      return;
    }

    const items = [];
    if (goldQty > 0) {
      items.push({
        ticketTypeId: gold.id,
        quantity: goldQty,
        sellingPrice: Number(goldPrice),
      });
    }
    if (vipQty > 0) {
      items.push({
        ticketTypeId: vip.id,
        quantity: vipQty,
        sellingPrice: Number(vipPrice),
      });
    }

    mutation.mutate({
      eventDay,
      customer: {
        name: customer.name.trim(),
        mobile: customer.mobile.trim(),
        email: customer.email || null,
      },
      items,
      adminPaymentProofUrl: proofUrl,
    });
  };

  const canNext = () => {
    if (step === 1) return eventDay >= 1 && eventDay <= 10;
    if (step === 2) return summary.qty >= 1 && !summary.goldPriceError && !summary.vipPriceError;
    if (step === 3)
      return customer.name.trim().length >= 2 && customer.mobile.replace(/\D/g, '').length >= 10;
    if (step === 4) return Boolean(proofUrl) && summary.baseAmount > 0;
    return true;
  };

  const selectedDay = days.find((d) => d.day === eventDay);
  const upi = upiQuery.data;

  if (success) {
    return (
      <div className="animate-kesariya-in space-y-5 pb-8">
        <div className="text-center">
          <SuccessTicketIllustration className="mx-auto h-28 w-40" />
          <h1 className="font-display mt-3 text-2xl font-bold text-navy-900">Booking submitted!</h1>
          <p className="mt-1 font-mono text-sm text-orange-600">{success.saleNumber}</p>
        </div>

        <Card className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-navy-700/50">Tickets</p>
              <p className="font-display text-xl font-bold">{success.totalQuantity}</p>
            </div>
            <div>
              <p className="text-xs text-navy-700/50">Day</p>
              <p className="font-semibold">
                Day {success.eventDay}
                {selectedDay ? ` · ${selectedDay.calendarDay} Oct` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-navy-700/50">Customer</p>
              <p className="font-semibold">{success.customer.name}</p>
            </div>
            <div>
              <p className="text-xs text-navy-700/50">Admin base</p>
              <p className="font-semibold">{rupee(success.baseAmount)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-navy-700/8 pt-3">
            <StatusBadge status={success.customerPaymentStatus || 'PAID'} kind="payment" />
            <StatusBadge status={success.saleStatus} kind="sale" />
            <StatusBadge status={success.deliveryStatus} kind="delivery" />
          </div>
          <p className="text-xs text-navy-700/60">
            Payment screenshot received. Tickets will be sent after admin approval — not sent yet.
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => navigate(`/seller/sales/${success.id}`)}>
            View booking
          </Button>
          <Button
            onClick={() => {
              setSuccess(null);
              setStep(1);
              setGoldQty(0);
              setVipQty(0);
              setProofUrl(null);
              setProofPreview(null);
              setCustomer({ name: '', mobile: '', email: '' });
            }}
          >
            New sale
          </Button>
        </div>
        <Link to="/seller" className="block text-center text-sm font-semibold text-orange-600">
          Back to home
        </Link>
      </div>
    );
  }

  const stickyMeta =
    step === 2 ? (
      <div className="grid grid-cols-3 divide-x divide-navy-700/10">
        <div className="px-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-700/45">
            Tickets
          </p>
          <p className="font-display mt-0.5 text-xl font-bold tabular-nums text-navy-900">
            {summary.qty}
          </p>
        </div>
        <div className="px-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-700/45">
            Customer
          </p>
          <p className="font-display mt-0.5 text-lg font-bold tabular-nums text-navy-900">
            {rupee(summary.customerTotal)}
          </p>
        </div>
        <div className="px-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-700/45">
            Margin
          </p>
          <p className="font-display mt-0.5 text-lg font-bold tabular-nums text-orange-600">
            {rupee(summary.margin)}
          </p>
        </div>
      </div>
    ) : null;

  return (
    <div className="animate-kesariya-in space-y-4 pb-2">
      {/* Progress */}
      <div className="rounded-[var(--radius-lg)] border border-navy-700/10 bg-white px-3 py-3 shadow-[var(--shadow-card)]">
        <ol className="flex items-center gap-1" aria-label="Booking progress">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex flex-1 items-center gap-1">
              <button
                type="button"
                onClick={() => s.id < step && setStep(s.id)}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition',
                  step === s.id && 'bg-orange-500 text-white',
                  step > s.id && 'bg-emerald-500 text-white',
                  step < s.id && 'bg-navy-700/10 text-navy-700/45',
                )}
                aria-current={step === s.id ? 'step' : undefined}
              >
                {step > s.id ? <Check className="h-3.5 w-3.5" /> : String(s.id).padStart(2, '0')}
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    'h-0.5 flex-1 rounded',
                    step > s.id ? 'bg-emerald-400' : 'bg-navy-700/10',
                  )}
                />
              )}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-center text-xs font-semibold text-navy-700/55">
          Step {step} · {STEPS[step - 1].label}
        </p>
      </div>

      {step === 1 && (
        <Card className="space-y-3 p-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-navy-900">Choose day</h2>
            <p className="mt-0.5 text-xs text-navy-700/55">11 Oct (Day 1) → 20 Oct (Day 10)</p>
          </div>
          <EventDaySelector value={eventDay} onChange={setEventDay} />
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {[
            {
              label: 'GOLD',
              qty: goldQty,
              setQty: setGoldQty,
              price: goldPrice,
              setPrice: setGoldPrice,
              base: goldBase,
              min: goldMin,
              suggested: goldSuggested,
              error: summary.goldPriceError,
              accent: 'border-l-[3px] border-l-amber-500',
            },
            {
              label: 'VIP',
              qty: vipQty,
              setQty: setVipQty,
              price: vipPrice,
              setPrice: setVipPrice,
              base: vipBase,
              min: vipMin,
              suggested: vipSuggested,
              error: summary.vipPriceError,
              accent: 'border-l-[3px] border-l-navy-800',
            },
          ].map((row) => (
            <Card key={row.label} className={cn('space-y-3 p-4', row.accent)}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold tracking-tight text-navy-900">
                    {row.label}
                  </p>
                  <p className="text-xs text-navy-700/55">Base {rupee(row.base)}</p>
                </div>
                <QuantityStepper
                  value={row.qty}
                  onChange={row.setQty}
                  label={`${row.label} quantity`}
                />
              </div>
              {row.qty > 0 && (
                <div className="space-y-1.5 border-t border-navy-700/8 pt-3">
                  <Label htmlFor={`price-${row.label}`}>Selling price / ticket</Label>
                  <Input
                    id={`price-${row.label}`}
                    type="number"
                    min={row.min}
                    value={row.price}
                    error={row.error}
                    onChange={(e) => row.setPrice(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-navy-700/55">
                    <span>Min {rupee(row.min)}</span>
                    <span>Suggested {rupee(row.suggested)}</span>
                  </div>
                  {row.error ? (
                    <p className="text-xs font-semibold text-red-600">
                      Below minimum selling price
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-emerald-700">
                      Margin / ticket: {rupee(Number(row.price) - row.base)}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {step === 3 && (
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Customer</h2>
          <div>
            <Label htmlFor="cust-mobile">Mobile number</Label>
            <Input
              id="cust-mobile"
              value={customer.mobile}
              onChange={(e) => void lookupCustomer(e.target.value)}
              inputMode="numeric"
              placeholder="10-digit mobile"
            />
            {existingNote && (
              <div className="mt-2 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Existing customer: <strong>{existingNote}</strong>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="cust-name">Customer name</Label>
            <Input
              id="cust-name"
              value={customer.name}
              onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label htmlFor="cust-email">Email (optional)</Label>
            <Input
              id="cust-email"
              value={customer.email}
              onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
              placeholder="email@example.com"
            />
          </div>
        </Card>
      )}

      {step === 4 && (
        <div className="space-y-4">
          {/* Amount hero */}
          <div className="overflow-hidden rounded-[var(--radius-lg)] bg-navy-950 text-white shadow-[var(--shadow-elevated)]">
            <div className="relative px-4 py-5">
              <div
                className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-orange-500/25 blur-2xl"
                aria-hidden
              />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                    Step 1 · Pay admin
                  </p>
                  <p className="mt-2 text-sm text-white/55">Admin base amount</p>
                  <p className="font-display mt-0.5 text-4xl font-bold tracking-tight tabular-nums">
                    {rupee(summary.baseAmount)}
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                  <IndianRupee className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <p className="relative mt-3 text-xs text-white/45">
                Pay this amount via UPI/QR, then upload the screenshot below.
              </p>
            </div>
          </div>

          {/* UPI + QR unified card */}
          <Card className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-white">
                1
              </span>
              <div>
                <p className="font-display text-base font-semibold text-navy-900">Pay with UPI</p>
                <p className="text-xs text-navy-700/50">Copy ID, open app, or scan QR</p>
              </div>
            </div>

            {upiQuery.isLoading && (
              <p className="text-sm text-navy-700/50">Loading payment details…</p>
            )}

            {upi && (
              <>
                <div className="rounded-[var(--radius-md)] bg-surface px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-700/45">
                        Payee
                      </p>
                      <p className="truncate font-semibold text-navy-900">
                        {upi.upiPayeeName ?? 'Kesariya Navratri 4.0'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-navy-700/8 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-700/45">
                      UPI ID
                    </p>
                    <p className="mt-0.5 break-all font-mono text-lg font-bold text-navy-900">
                      {upi.upiId ?? '—'}
                    </p>
                  </div>
                  {upi.upiInstructions && (
                    <p className="mt-2 text-xs leading-relaxed text-navy-700/55">
                      {upi.upiInstructions}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {upi.upiId && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={() => {
                        void navigator.clipboard.writeText(upi.upiId!);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? 'Copied' : 'Copy UPI'}
                    </Button>
                  )}
                  {upi.upiDeepLink ? (
                    <a
                      href={upi.upiDeepLink}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[#25D366] px-3 text-sm font-bold text-white transition hover:bg-[#1ebe57]"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      Open UPI
                    </a>
                  ) : (
                    <div />
                  )}
                </div>

                <div className="rounded-[var(--radius-md)] border border-dashed border-navy-700/15 bg-white px-3 py-4 text-center">
                  <p className="mb-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-700/45">
                    <QrCode className="h-3.5 w-3.5" aria-hidden />
                    Scan & pay {rupee(summary.baseAmount)}
                  </p>
                  {mediaUrl(upi.displayQrUrl) ? (
                    <img
                      src={mediaUrl(upi.displayQrUrl)!}
                      alt="UPI QR code"
                      className="mx-auto h-48 w-48 rounded-lg bg-white object-contain"
                    />
                  ) : (
                    <p className="py-8 text-xs text-navy-700/50">QR unavailable — use UPI ID</p>
                  )}
                </div>
              </>
            )}
          </Card>

          {/* Screenshot upload */}
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white',
                  proofUrl ? 'bg-emerald-500' : 'bg-orange-500',
                )}
              >
                {proofUrl ? <Check className="h-3.5 w-3.5" /> : '2'}
              </span>
              <div>
                <p className="font-display text-base font-semibold text-navy-900">
                  Upload payment screenshot
                </p>
                <p className="text-xs text-navy-700/50">
                  Required before you can continue
                </p>
              </div>
            </div>
            <PaymentProofUploader
              previewUrl={proofPreview}
              uploadedUrl={proofUrl}
              uploading={uploading}
              disabled={summary.baseAmount <= 0}
              onSelect={(f) => void onProofSelected(f)}
              onClear={clearProof}
            />
            {!proofUrl && !uploading && (
              <p className="rounded-[var(--radius-md)] bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Continue unlocks after screenshot upload.
              </p>
            )}
          </Card>
        </div>
      )}

      {step === 5 && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-orange-600" aria-hidden />
            <h2 className="font-display text-lg font-semibold">Booking summary</h2>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-navy-700/55">Day</dt>
              <dd className="font-semibold">{selectedDay?.label ?? `Day ${eventDay}`}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy-700/55">Tickets</dt>
              <dd className="font-semibold">
                {goldQty > 0 && `Gold × ${goldQty}`}
                {goldQty > 0 && vipQty > 0 && ' · '}
                {vipQty > 0 && `VIP × ${vipQty}`}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy-700/55">Customer</dt>
              <dd className="text-right font-semibold">
                {customer.name}
                <span className="mt-0.5 block text-xs font-normal text-navy-700/50">
                  {customer.mobile}
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy-700/55">Customer total</dt>
              <dd className="font-semibold">{rupee(summary.customerTotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy-700/55">Admin base</dt>
              <dd className="font-semibold">{rupee(summary.baseAmount)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-navy-700/8 pt-2">
              <dt className="text-navy-700/55">Payment proof</dt>
              <dd className="font-semibold text-emerald-700">
                {proofUrl ? 'Uploaded' : 'Missing'}
              </dd>
            </div>
            <div className="flex justify-between gap-3 font-semibold text-orange-600">
              <dt>Your margin</dt>
              <dd>{rupee(summary.margin)}</dd>
            </div>
          </dl>
          {proofPreview || proofUrl ? (
            <img
              src={proofPreview ?? mediaUrl(proofUrl) ?? undefined}
              alt="Payment proof"
              className="max-h-36 rounded-[var(--radius-md)] border border-navy-700/10 object-contain"
            />
          ) : null}
        </Card>
      )}

      {error && (
        <p
          className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <StickyActionBar meta={stickyMeta ?? undefined}>
        <div className="flex gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-w-[5.5rem] shrink-0"
              onClick={() => {
                setError(null);
                setStep((s) => s - 1);
              }}
            >
              Back
            </Button>
          )}
          {step < 5 ? (
            <Button
              className="w-full"
              size="lg"
              disabled={!canNext()}
              onClick={() => {
                setError(null);
                setStep((s) => s + 1);
              }}
            >
              {step === 4 && !proofUrl
                ? uploading
                  ? 'Uploading…'
                  : 'Upload screenshot first'
                : 'Continue'}
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              loading={mutation.isPending}
              disabled={typesQuery.isLoading}
              onClick={confirm}
            >
              Submit booking
            </Button>
          )}
        </div>
      </StickyActionBar>
    </div>
  );
}

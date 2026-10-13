import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ImagePlus, Send } from 'lucide-react';
import { fetchWhatsappStatus, sendWhatsappBulk } from '../../api/whatsapp';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { PageHeader } from '../../components/ui/page-header';
import { BRAND } from '../../lib/brand';

const DEFAULT_MESSAGE = `Namaste,

${BRAND.eventFull} — ${BRAND.group}
Pass enquiry

Dates: ${BRAND.datesFull}
Venue: ${BRAND.venue}, ${BRAND.venueArea}, ${BRAND.city}

Reply to this message or call ${BRAND.supportPhoneDisplay}.`;

const fieldClass =
  'w-full rounded-[var(--radius-md)] border border-navy-700/15 bg-white px-3 py-2.5 text-sm text-navy-900 outline-none focus:border-orange-400';

export function AdminWhatsappBulkPage() {
  const status = useQuery({ queryKey: ['whatsapp-status'], queryFn: fetchWhatsappStatus });
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const count = useMemo(
    () => numbers.split(/[\s,;|]+/).map((p) => p.trim()).filter(Boolean).length,
    [numbers],
  );

  const send = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose the pass image');
      const form = new FormData();
      form.append('numbers', numbers);
      form.append('message', message);
      form.append('image', file);
      return sendWhatsappBulk(form);
    },
  });

  function onFile(next: File | null) {
    setFile(next);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  const configured = status.data?.configured ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="WhatsApp"
        title="Pass enquiry blast"
        description="Paste numbers. The same pass image and message goes to every valid number."
      />

      {status.data && (
        <Card className="p-4 text-sm text-navy-800">
          {configured ? (
            <p>
              Connected · sending from {status.data.fromDisplay}
              {status.data.usingTestNumber ? ' · Meta test number (real customers will fail)' : ''}
              {status.data.devMode ? ' · dev mode (no real send)' : ''}
            </p>
          ) : (
            <p className="text-amber-950">
              Send bandh che karan ke API par WhatsApp token load nathi. Server par deploy pachhi
              restart joiye. Token Khodi Mart <code>.env.prod</code> mathi aave, ke{' '}
              <code>backend/.env</code> ma <code>WHATSAPP_API_TOKEN</code> ane{' '}
              <code>WHATSAPP_PHONE_ID</code> hova joiye.
            </p>
          )}
        </Card>
      )}

      <Card className="space-y-4 p-4 sm:p-5">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-navy-700/55">
            Numbers ({count}
            {status.data ? ` / ${status.data.maxNumbers}` : ''})
          </span>
          <textarea
            className={`${fieldClass} mt-1.5 min-h-36 font-mono`}
            placeholder={'7041501799\n9876543210\n+91 91234 56789'}
            value={numbers}
            onChange={(e) => setNumbers(e.target.value)}
          />
          <span className="mt-1 block text-xs text-navy-700/50">
            One number per line, or separated by comma. 10-digit numbers get 91 automatically.
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-navy-700/55">
            Message under the image
          </span>
          <textarea
            className={`${fieldClass} mt-1.5 min-h-40`}
            maxLength={1024}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <span className="mt-1 block text-xs text-navy-700/50">{message.length}/1024</span>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-navy-700/20 px-3 py-3">
          <ImagePlus className="h-5 w-5 text-orange-600" />
          <span className="text-sm text-navy-800">
            {file ? file.name : 'Choose pass image (JPG, PNG, WEBP, max 5 MB)'}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {preview && (
          <img src={preview} alt="Pass preview" className="max-h-48 rounded-[var(--radius-md)]" />
        )}

        <Button
          type="button"
          disabled={!configured || send.isPending || !file || count === 0}
          loading={send.isPending}
          onClick={() => send.mutate()}
        >
          <Send className="h-4 w-4" />
          Send to {count || 0} number{count === 1 ? '' : 's'}
        </Button>
        {send.isPending && (
          <p className="text-xs text-navy-700/55">Sending one by one. Keep this page open.</p>
        )}
        {send.error && <p className="text-sm text-red-600">{getErrorMessage(send.error)}</p>}
      </Card>

      {send.data && (
        <Card className="p-4 sm:p-5">
          <p className="font-display text-lg font-semibold text-navy-900">
            {send.data.devMode ? 'Dev mode · ' : ''}Sent {send.data.sent} · Failed {send.data.failed}
          </p>
          {send.data.duplicatesSkipped > 0 && (
            <p className="mt-1 text-xs text-navy-700/55">
              {send.data.duplicatesSkipped} duplicate number
              {send.data.duplicatesSkipped === 1 ? '' : 's'} skipped
            </p>
          )}
          {send.data.invalid.length > 0 && (
            <p className="mt-2 text-sm text-amber-800">
              Skipped invalid: {send.data.invalid.join(', ')}
            </p>
          )}
          <ul className="mt-3 max-h-72 space-y-1 overflow-auto text-sm">
            {send.data.results.map((row) => (
              <li
                key={row.to}
                className="flex justify-between gap-3 border-b border-navy-700/5 py-1.5"
              >
                <span className="font-mono">{row.to}</span>
                <span className={row.ok ? 'text-emerald-700' : 'text-red-600'}>
                  {row.ok ? 'Sent' : row.error}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPaymentSettings, updatePaymentSettings } from '../../api/pricing';
import { uploadUpiQr } from '../../api/uploads';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { mediaUrl } from '../../lib/uploads';

export function AdminPaymentSettingsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['payment-settings'], queryFn: () => getPaymentSettings() });
  const [upiId, setUpiId] = useState('');
  const [payee, setPayee] = useState('');
  const [instructions, setInstructions] = useState('');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [supportWa, setSupportWa] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setUpiId(query.data.upiId ?? '');
    setPayee(query.data.upiPayeeName ?? '');
    setInstructions(query.data.upiInstructions ?? '');
    setQrUrl(query.data.upiQrImageUrl);
    setSupportWa(query.data.supportWhatsapp ?? '');
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: updatePaymentSettings,
    onSuccess: async () => {
      setError(null);
      setOk(true);
      await qc.invalidateQueries({ queryKey: ['payment-settings'] });
      setTimeout(() => setOk(false), 2500);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const onQrFile = async (file: File | null) => {
    if (!file) return;
    setUploadingQr(true);
    setError(null);
    try {
      const uploaded = await uploadUpiQr(file);
      setQrUrl(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'QR upload failed');
    } finally {
      setUploadingQr(false);
    }
  };

  if (query.isLoading) return <p className="text-sm text-navy-700/60">Loading…</p>;
  if (query.error) return <p className="text-sm text-red-600">{getErrorMessage(query.error)}</p>;

  const liveQr = mediaUrl(qrUrl) || mediaUrl(query.data?.qrCodeDataUrl);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
          Settlement
        </p>
        <h1 className="font-display text-2xl font-bold text-navy-900">Payment settings</h1>
        <p className="mt-1 text-sm text-navy-700/70">
          UPI + QR for sellers. Payment screenshot with booking. Support WhatsApp for help desk.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Payment settings saved.
        </p>
      )}

      <Card className="space-y-4">
        <div>
          <Label>UPI ID (VPA)</Label>
          <Input
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="kesariya@upi"
          />
        </div>
        <div>
          <Label>Payee name</Label>
          <Input
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder="Kesariya Navratri 4.0"
          />
        </div>
        <div>
          <Label>Instructions for sellers</Label>
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-navy-700/15 bg-white px-3 py-2 text-sm"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        <div>
          <Label>Seller support WhatsApp</Label>
          <Input
            value={supportWa}
            onChange={(e) => setSupportWa(e.target.value)}
            placeholder="9198XXXXXXXX"
          />
          <p className="mt-1 text-xs text-navy-700/50">
            Digits with country code. Sellers use this for confirmation help.
          </p>
        </div>

        <div className="space-y-2">
          <Label>QR code</Label>
          <p className="text-xs text-navy-700/60">
            Auto-generated from UPI ID. Optionally upload your own QR image.
          </p>
          {liveQr && (
            <img
              src={liveQr}
              alt="UPI QR preview"
              className="h-48 w-48 rounded-lg border border-navy-700/10 bg-white object-contain p-2"
            />
          )}
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploadingQr}
            onChange={(e) => void onQrFile(e.target.files?.[0] ?? null)}
          />
          {uploadingQr && <p className="text-xs text-orange-600">Uploading QR…</p>}
          {qrUrl && (
            <Button type="button" variant="outline" size="sm" onClick={() => setQrUrl(null)}>
              Clear custom QR (use auto-generated)
            </Button>
          )}
        </div>

        <Button
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              upiId,
              upiPayeeName: payee,
              upiInstructions: instructions,
              upiQrImageUrl: qrUrl,
              supportWhatsapp: supportWa,
              requireUtrForUpi: false,
            })
          }
        >
          Save settings
        </Button>
      </Card>

      <Card className="space-y-3 border-navy-800/10 bg-navy-950 p-5 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-400">
          How seller sees payment screen
        </p>
        <p className="font-display text-lg font-semibold">{payee || 'Kesariya Navratri 4.0'}</p>
        <p className="font-mono text-base">{upiId || 'upi@example'}</p>
        {instructions && <p className="text-sm text-white/65">{instructions}</p>}
        {liveQr && (
          <img
            src={liveQr}
            alt="Seller-facing QR preview"
            className="mt-2 h-36 w-36 rounded-lg bg-white object-contain p-2"
          />
        )}
      </Card>

      <Card className="space-y-2 text-sm text-navy-700/70">
        <p className="font-semibold text-navy-900">Seller flow</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Seller books tickets + pays UPI/QR + uploads screenshot → payment PAID.</li>
          <li>Admin approves only when payment is PAID.</li>
          <li>Admin marks ticket sent. Sellers use Support WhatsApp for help.</li>
        </ol>
      </Card>
    </div>
  );
}

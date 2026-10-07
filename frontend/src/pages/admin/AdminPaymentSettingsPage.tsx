import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUpiAccount,
  getPaymentSettings,
  setMainUpiAccount,
  setReceivingUpiAccount,
  updatePaymentSettings,
  updateUpiAccount,
  type UpiAccountRow,
} from '../../api/pricing';
import { uploadUpiQr } from '../../api/uploads';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { mediaUrl } from '../../lib/uploads';

function rupee(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function AccountCard({
  account,
  busy,
  onSetMain,
  onSetReceiving,
  onDeactivate,
  onActivate,
}: {
  account: UpiAccountRow;
  busy: boolean;
  onSetMain: () => void;
  onSetReceiving: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  const pct =
    account.rotateLimitAmount > 0
      ? Math.min(100, Math.round((account.receivedBase / account.rotateLimitAmount) * 100))
      : 0;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-semibold text-navy-900">{account.label}</p>
          <p className="font-mono text-sm text-navy-800">{account.upiId}</p>
          <p className="text-xs text-navy-700/55">{account.payeeName}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {account.isMain && (
            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
              Main
            </span>
          )}
          {account.isReceiving && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Receiving now
            </span>
          )}
          {account.status === 'INACTIVE' && (
            <span className="rounded-full bg-navy-700/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-700/60">
              Inactive
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-navy-700/60">
          <span>
            Today (approved): <strong className="text-navy-900">{rupee(account.receivedBase)}</strong>
          </span>
          <span>
            Limit {rupee(account.rotateLimitAmount)} · left {rupee(account.remainingToLimit)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-navy-700/10">
          <div
            className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-orange-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-navy-700/45">
          {account.approvedCount} approved sale{account.approvedCount === 1 ? '' : 's'} today
        </p>
      </div>

      {account.qrImageUrl && mediaUrl(account.qrImageUrl) && (
        <img
          src={mediaUrl(account.qrImageUrl)!}
          alt={`${account.label} QR`}
          className="h-24 w-24 rounded-lg border border-navy-700/10 bg-white object-contain p-1"
        />
      )}

      <div className="flex flex-wrap gap-2">
        {!account.isMain && account.status === 'ACTIVE' && (
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onSetMain}>
            Set main
          </Button>
        )}
        {!account.isReceiving && account.status === 'ACTIVE' && (
          <Button type="button" size="sm" disabled={busy} onClick={onSetReceiving}>
            Set receiving
          </Button>
        )}
        {account.status === 'ACTIVE' ? (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onDeactivate}>
            Deactivate
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onActivate}>
            Activate
          </Button>
        )}
      </div>
    </Card>
  );
}

export function AdminPaymentSettingsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['payment-settings'], queryFn: () => getPaymentSettings() });

  const [supportWa, setSupportWa] = useState('');
  const [sharedInstructions, setSharedInstructions] = useState('');
  const [defaultLimit, setDefaultLimit] = useState('100000');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [label, setLabel] = useState('');
  const [upiId, setUpiId] = useState('');
  const [payee, setPayee] = useState('');
  const [instructions, setInstructions] = useState('');
  const [limit, setLimit] = useState('100000');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [setAsMain, setSetAsMain] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setSupportWa(query.data.supportWhatsapp ?? '');
    setSharedInstructions(query.data.upiInstructions ?? '');
    setDefaultLimit(String(query.data.defaultRotateLimitAmount ?? 100000));
  }, [query.data]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['payment-settings'] });
  };

  const globalsMutation = useMutation({
    mutationFn: () =>
      updatePaymentSettings({
        supportWhatsapp: supportWa,
        upiInstructions: sharedInstructions,
        defaultRotateLimitAmount: Number(defaultLimit) || 100000,
      }),
    onSuccess: async () => {
      setError(null);
      setOk('Shared settings saved.');
      await invalidate();
      setTimeout(() => setOk(null), 2500);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createUpiAccount({
        label,
        upiId,
        payeeName: payee,
        instructions: instructions || null,
        qrImageUrl: qrUrl,
        rotateLimitAmount: Number(limit) || 100000,
        setAsMain,
      }),
    onSuccess: async () => {
      setError(null);
      setOk('UPI account added.');
      setLabel('');
      setUpiId('');
      setPayee('');
      setInstructions('');
      setQrUrl(null);
      setSetAsMain(false);
      await invalidate();
      setTimeout(() => setOk(null), 2500);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const actionMutation = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: async () => {
      setError(null);
      await invalidate();
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

  const accounts = query.data?.accounts ?? [];
  const receiving = query.data?.receivingAccount;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
          Settlement
        </p>
        <h1 className="font-display text-2xl font-bold text-navy-900">Payment accounts</h1>
        <p className="mt-1 text-sm text-navy-700/70">
          Multiple UPI accounts. Sellers pay the <strong>receiving</strong> account. After admin
          approval, day-wise base totals rotate when the limit is reached.
        </p>
        {query.data?.statsDate && (
          <p className="mt-1 text-xs text-navy-700/50">Today (IST): {query.data.statsDate}</p>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {ok}
        </p>
      )}

      {receiving && (
        <Card className="space-y-2 border-emerald-200 bg-emerald-50/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Sellers pay this account now
          </p>
          <p className="font-display text-lg font-semibold text-navy-900">{receiving.label}</p>
          <p className="font-mono text-base">{receiving.upiId}</p>
          <p className="text-sm text-navy-700/65">
            Today received {rupee(receiving.receivedBase)} / {rupee(receiving.rotateLimitAmount)}
          </p>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-navy-900">UPI accounts</h2>
        {accounts.length === 0 && (
          <p className="text-sm text-navy-700/55">No accounts yet — add the first UPI below.</p>
        )}
        {accounts.map((a) => (
          <AccountCard
            key={a.id}
            account={a}
            busy={actionMutation.isPending}
            onSetMain={() => actionMutation.mutate(() => setMainUpiAccount(a.id))}
            onSetReceiving={() => actionMutation.mutate(() => setReceivingUpiAccount(a.id))}
            onDeactivate={() =>
              actionMutation.mutate(() => updateUpiAccount(a.id, { status: 'INACTIVE' }))
            }
            onActivate={() =>
              actionMutation.mutate(() => updateUpiAccount(a.id, { status: 'ACTIVE' }))
            }
          />
        ))}
      </div>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Add UPI account</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="HDFC Main"
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
        </div>
        <div>
          <Label>UPI ID</Label>
          <Input
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="kesariya@upi"
          />
        </div>
        <div>
          <Label>Day-wise rotate limit (₹ admin base)</Label>
          <Input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="numeric" />
        </div>
        <div>
          <Label>Instructions (optional)</Label>
          <textarea
            className="min-h-[72px] w-full rounded-lg border border-navy-700/15 bg-white px-3 py-2 text-sm"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>QR image (optional)</Label>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploadingQr}
            onChange={(e) => void onQrFile(e.target.files?.[0] ?? null)}
          />
          {qrUrl && mediaUrl(qrUrl) && (
            <img
              src={mediaUrl(qrUrl)!}
              alt="New QR"
              className="h-28 w-28 rounded-lg border bg-white object-contain p-1"
            />
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-navy-800">
          <input
            type="checkbox"
            checked={setAsMain}
            onChange={(e) => setSetAsMain(e.target.checked)}
          />
          Set as main + receiving now
        </label>
        <Button
          disabled={
            createMutation.isPending || !label.trim() || !upiId.trim() || !payee.trim()
          }
          onClick={() => createMutation.mutate()}
        >
          Add account
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Shared settings</h2>
        <div>
          <Label>Default day-wise rotate limit (₹)</Label>
          <Input
            value={defaultLimit}
            onChange={(e) => setDefaultLimit(e.target.value)}
            inputMode="numeric"
          />
          <p className="mt-1 text-xs text-navy-700/50">
            Applied to new accounts. Count = approved sale baseAmount for the IST day.
          </p>
        </div>
        <div>
          <Label>Seller support WhatsApp</Label>
          <Input
            value={supportWa}
            onChange={(e) => setSupportWa(e.target.value)}
            placeholder="9198XXXXXXXX"
          />
        </div>
        <div>
          <Label>Fallback instructions</Label>
          <textarea
            className="min-h-[80px] w-full rounded-lg border border-navy-700/15 bg-white px-3 py-2 text-sm"
            value={sharedInstructions}
            onChange={(e) => setSharedInstructions(e.target.value)}
          />
        </div>
        <Button disabled={globalsMutation.isPending} onClick={() => globalsMutation.mutate()}>
          Save shared settings
        </Button>
      </Card>

      <Card className="space-y-2 text-sm text-navy-700/70">
        <p className="font-semibold text-navy-900">How rotation works</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Sellers always see the current <strong>receiving</strong> UPI.</li>
          <li>Admin approves a sale → that sale&apos;s baseAmount counts for today.</li>
          <li>When today&apos;s total ≥ account limit → next active UPI becomes receiving.</li>
          <li>Next IST day totals reset. Use Set main to force payments back.</li>
        </ol>
      </Card>
    </div>
  );
}

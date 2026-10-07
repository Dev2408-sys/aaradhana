import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { changePasswordRequest } from '../../api/auth';
import { getMySeller, updateMySeller } from '../../api/sellers';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../features/auth/AuthContext';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { formatDate, initials, roleTone, statusTone } from '../../lib/seller-display';

export function SellerProfilePage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    city: '',
    area: '',
    instagramHandle: '',
    expectedSales: '',
  });
  const [pwd, setPwd] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const meQuery = useQuery({ queryKey: ['sellers-me'], queryFn: getMySeller });
  const me = meQuery.data;

  useEffect(() => {
    if (!me) return;
    setForm({
      name: me.name,
      email: me.email ?? '',
      city: me.city ?? '',
      area: me.area ?? '',
      instagramHandle: me.instagramHandle ?? '',
      expectedSales: me.expectedSales?.toString() ?? '',
    });
  }, [me]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateMySeller({
        name: form.name,
        email: form.email || null,
        city: form.city || null,
        area: form.area || null,
        instagramHandle: form.instagramHandle || null,
        expectedSales: form.expectedSales ? Number(form.expectedSales) : null,
      }),
    onSuccess: () => {
      setMessage('Profile saved');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['sellers-me'] });
      setTimeout(() => setMessage(null), 2500);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const pwdMutation = useMutation({
    mutationFn: () => changePasswordRequest(pwd.currentPassword, pwd.newPassword),
    onSuccess: () => {
      setPwdMessage('Password updated');
      setPwdError(null);
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwdMessage(null), 2500);
    },
    onError: (err) => setPwdError(getErrorMessage(err)),
  });

  if (meQuery.isLoading) {
    return <p className="text-sm text-navy-700/60">Loading profile…</p>;
  }

  if (!me) {
    return <p className="text-sm text-red-600">{getErrorMessage(meQuery.error)}</p>;
  }

  const savePassword = () => {
    setPwdError(null);
    if (pwd.newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters');
      return;
    }
    if (pwd.newPassword !== pwd.confirmPassword) {
      setPwdError('New passwords do not match');
      return;
    }
    pwdMutation.mutate();
  };

  return (
    <div className="animate-kesariya-in space-y-5">
      <Card className="overflow-hidden p-0">
        <div className="relative overflow-hidden bg-navy-950 px-4 py-6 text-white">
          <div
            className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl"
            aria-hidden
          />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-orange-500 font-display text-xl font-bold">
              {initials(me.name)}
            </div>
            <div className="min-w-0">
              <h1 className="font-display truncate text-2xl font-bold">{me.name}</h1>
              <p className="font-mono text-sm text-orange-300">{me.sellerCode}</p>
            </div>
          </div>
          <div className="relative mt-4 flex flex-wrap gap-2">
            <Badge tone={roleTone(me.role)}>{me.role.replace('_', ' ')}</Badge>
            <Badge tone={statusTone(me.activationStatus)}>{me.activationStatus}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
          <div>
            <p className="text-[10px] uppercase text-navy-700/45">Mobile</p>
            <p className="font-semibold">{me.mobile}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-navy-700/45">Joined</p>
            <p className="font-semibold">{formatDate(me.joinedAt)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] uppercase text-navy-700/45">Parent / master</p>
            <p className="font-semibold">
              {me.parentSeller
                ? `${me.parentSeller.name} (${me.parentSeller.sellerCode})`
                : 'Top-level'}
            </p>
          </div>
        </div>
      </Card>

      {me.activationStatus === 'PENDING' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your seller profile is pending admin activation. You can update details now; selling unlocks
          after ACTIVE status.
        </div>
      )}

      <Card className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Profile details</h2>
          <p className="text-xs text-navy-700/55">
            Keep name, city, and Instagram updated so admin can verify you easily.
          </p>
        </div>
        <div className="grid gap-3">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label>Mobile (login ID)</Label>
            <Input value={me.mobile} disabled />
            <p className="mt-1 text-[11px] text-navy-700/45">Mobile cannot be changed here.</p>
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div>
              <Label>Area</Label>
              <Input
                value={form.area}
                onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Instagram</Label>
            <Input
              value={form.instagramHandle}
              onChange={(e) => setForm((f) => ({ ...f, instagramHandle: e.target.value }))}
            />
          </div>
          <div>
            <Label>Expected sales</Label>
            <Input
              type="number"
              value={form.expectedSales}
              onChange={(e) => setForm((f) => ({ ...f, expectedSales: e.target.value }))}
            />
          </div>
        </div>

        {(message || error) && (
          <p className={`text-sm ${error ? 'text-red-600' : 'text-emerald-700'}`}>
            {error ?? message}
          </p>
        )}

        <Button
          className="w-full"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Password</h2>
          <p className="text-xs text-navy-700/55">
            Change the password you use on the sign-in screen.
          </p>
        </div>
        <div>
          <Label>Current password</Label>
          <Input
            type={showPwd ? 'text' : 'password'}
            value={pwd.currentPassword}
            onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))}
            autoComplete="current-password"
          />
        </div>
        <div>
          <Label>New password</Label>
          <div className="relative">
            <Input
              type={showPwd ? 'text' : 'password'}
              className="pr-11"
              value={pwd.newPassword}
              onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-navy-700/50"
              onClick={() => setShowPwd((v) => !v)}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <Label>Confirm new password</Label>
          <Input
            type={showPwd ? 'text' : 'password'}
            value={pwd.confirmPassword}
            onChange={(e) => setPwd((p) => ({ ...p, confirmPassword: e.target.value }))}
            autoComplete="new-password"
          />
        </div>
        {(pwdMessage || pwdError) && (
          <p className={`text-sm ${pwdError ? 'text-red-600' : 'text-emerald-700'}`}>
            {pwdError ?? pwdMessage}
          </p>
        )}
        <Button
          variant="secondary"
          className="w-full"
          onClick={savePassword}
          disabled={pwdMutation.isPending}
        >
          {pwdMutation.isPending ? 'Updating…' : 'Update password'}
        </Button>
      </Card>

      <Card className="space-y-2 text-sm text-navy-700/70">
        <p className="font-semibold text-navy-900">Account notes</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Seller code, role, and parent are managed by admin only.</li>
          <li>Signed in as {user?.name} ({user?.role?.replace('_', ' ')}).</li>
          {user?.lastLoginAt && <li>Last login: {formatDate(user.lastLoginAt)}</li>}
        </ul>
        <Button variant="outline" className="mt-2 w-full" onClick={() => void logout()}>
          Log out
        </Button>
      </Card>
    </div>
  );
}

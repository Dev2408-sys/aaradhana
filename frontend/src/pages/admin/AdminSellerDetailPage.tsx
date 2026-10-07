import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getReferralLink,
  getSeller,
  getSellerTeam,
  listSellers,
  updateSeller,
  updateSellerParent,
  updateSellerStatus,
} from '../../api/sellers';
import { getErrorMessage } from '../../api/client';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { formatDate, roleTone, statusTone } from '../../lib/seller-display';
import type { SellerActivationStatus } from '../../types/seller';

export function AdminSellerDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    city: '',
    area: '',
    instagramHandle: '',
    expectedSales: '',
  });

  const sellerQuery = useQuery({
    queryKey: ['seller', id],
    queryFn: () => getSeller(id),
    enabled: Boolean(id),
  });

  const teamQuery = useQuery({
    queryKey: ['seller-team', id],
    queryFn: () => getSellerTeam(id),
    enabled: Boolean(id),
  });

  const parentsQuery = useQuery({
    queryKey: ['sellers-parents'],
    queryFn: () => listSellers({ pageSize: 100 }),
  });

  const referralQuery = useQuery({
    queryKey: ['referral-link', id],
    queryFn: () => getReferralLink(id),
    enabled: Boolean(id),
  });

  const seller = sellerQuery.data;

  useEffect(() => {
    if (!seller) return;
    setForm({
      name: seller.name,
      email: seller.email ?? '',
      city: seller.city ?? '',
      area: seller.area ?? '',
      instagramHandle: seller.instagramHandle ?? '',
      expectedSales: seller.expectedSales?.toString() ?? '',
    });
  }, [seller]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['seller', id] });
    void queryClient.invalidateQueries({ queryKey: ['seller-team', id] });
    void queryClient.invalidateQueries({ queryKey: ['sellers'] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      updateSeller(id, {
        name: form.name,
        email: form.email || null,
        city: form.city || null,
        area: form.area || null,
        instagramHandle: form.instagramHandle || null,
        expectedSales: form.expectedSales ? Number(form.expectedSales) : null,
      }),
    onSuccess: () => {
      setMessage('Profile updated');
      setError(null);
      invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: (activationStatus: SellerActivationStatus) =>
      updateSellerStatus(id, activationStatus),
    onSuccess: () => {
      setMessage('Status updated');
      invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const parentMutation = useMutation({
    mutationFn: (parentSellerId: string | null) => updateSellerParent(id, parentSellerId),
    onSuccess: () => {
      setMessage('Parent updated');
      invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (sellerQuery.isLoading) {
    return <p className="text-sm text-navy-700/60">Loading seller…</p>;
  }

  if (!seller) {
    return <p className="text-sm text-red-600">{getErrorMessage(sellerQuery.error)}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/sellers" className="text-sm font-semibold text-orange-600">
            ← Back to sellers
          </Link>
          <h1 className="font-display mt-2 text-2xl font-bold text-navy-900">{seller.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={roleTone(seller.role)}>{seller.role}</Badge>
            <Badge tone={statusTone(seller.activationStatus)}>{seller.activationStatus}</Badge>
            <Badge>{seller.sellerCode}</Badge>
          </div>
        </div>
      </div>

      {(message || error) && (
        <p className={`text-sm ${error ? 'text-red-600' : 'text-emerald-700'}`}>
          {error ?? message}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Profile</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
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
          <p className="text-xs text-navy-700/50">
            Mobile: {seller.mobile} · Joined {formatDate(seller.joinedAt)} · Last login{' '}
            {formatDate(seller.lastLoginAt)}
          </p>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            Save profile
          </Button>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Account</h2>
          <div>
            <Label>Activation status</Label>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
              value={seller.activationStatus}
              onChange={(e) =>
                statusMutation.mutate(e.target.value as SellerActivationStatus)
              }
            >
              <option value="PENDING">PENDING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>
          <div>
            <Label>Parent seller</Label>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
              value={seller.parentSellerId ?? ''}
              onChange={(e) => parentMutation.mutate(e.target.value || null)}
            >
              <option value="">None (top-level)</option>
              {parentsQuery.data?.items
                .filter((p) => p.id !== seller.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sellerCode})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label>Referral link</Label>
            <p className="mt-1 break-all rounded-lg bg-surface px-3 py-2 text-sm">
              {referralQuery.data?.url ?? '—'}
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold">Hierarchy</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-navy-700/60">Parent</dt>
              <dd>
                {seller.parentSeller
                  ? `${seller.parentSeller.name} (${seller.parentSeller.sellerCode})`
                  : 'Top-level'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-navy-700/60">Level</dt>
              <dd>{seller.level}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-navy-700/60">Direct sellers</dt>
              <dd>{seller.teamSummary?.directSellers ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-navy-700/60">Total team sellers</dt>
              <dd>{seller.teamSummary?.totalTeamSellers ?? 0}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold">Performance</h2>
          <p className="mt-3 text-sm text-navy-700/70">
            {seller.performanceNote ?? 'Sales module coming in Phase 9'}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-display mb-3 text-lg font-semibold">Team</h2>
        <div className="space-y-2">
          {teamQuery.data?.directSellers.map((member) => (
            <Link
              key={member.id}
              to={`/admin/sellers/${member.id}`}
              className="flex items-center justify-between rounded-xl border border-navy-700/10 px-3 py-3 hover:bg-surface"
            >
              <div>
                <p className="font-medium text-navy-900">{member.name}</p>
                <p className="text-xs text-navy-700/50">
                  {member.sellerCode} · Level {member.level}
                </p>
              </div>
              <Badge tone={statusTone(member.activationStatus)}>{member.activationStatus}</Badge>
            </Link>
          ))}
          {teamQuery.data?.directSellers.length === 0 && (
            <p className="text-sm text-navy-700/50">No direct sellers yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

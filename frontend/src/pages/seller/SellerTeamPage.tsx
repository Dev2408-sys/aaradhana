import { useQuery } from '@tanstack/react-query';
import { getMySeller, getReferralLink, getSellerTeam } from '../../api/sellers';
import { getErrorMessage } from '../../api/client';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { formatDate, statusTone } from '../../lib/seller-display';

export function SellerTeamPage() {
  const meQuery = useQuery({ queryKey: ['sellers-me'], queryFn: getMySeller });
  const teamQuery = useQuery({
    queryKey: ['my-team', meQuery.data?.id],
    queryFn: () => getSellerTeam(meQuery.data!.id),
    enabled: Boolean(meQuery.data?.id),
  });
  const referralQuery = useQuery({
    queryKey: ['my-referral', meQuery.data?.id],
    queryFn: () => getReferralLink(meQuery.data!.id),
    enabled: Boolean(meQuery.data?.id),
  });

  if (meQuery.isLoading || teamQuery.isLoading) {
    return <p className="text-sm text-navy-700/60">Loading team…</p>;
  }

  if (meQuery.error || teamQuery.error) {
    return (
      <p className="text-sm text-red-600">
        {getErrorMessage(meQuery.error ?? teamQuery.error)}
      </p>
    );
  }

  const team = teamQuery.data!;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">My Team</h1>
        <p className="text-sm text-navy-700/70">Direct sellers and hierarchy overview.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-navy-700/50">Direct</p>
          <p className="font-display text-2xl font-bold">{team.summary.directSellers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-navy-700/50">Total team</p>
          <p className="font-display text-2xl font-bold">{team.summary.totalTeamSellers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-navy-700/50">Active</p>
          <p className="font-display text-2xl font-bold">{team.summary.activeSellers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-navy-700/50">Pending</p>
          <p className="font-display text-2xl font-bold">{team.summary.pendingSellers}</p>
        </Card>
      </div>

      {referralQuery.data && (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/50">
            Your referral link
          </p>
          <p className="mt-2 break-all text-sm font-medium text-orange-600">
            {referralQuery.data.url}
          </p>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <h2 className="font-display text-lg font-semibold">Direct sellers</h2>
        {team.directSellers.length === 0 && (
          <p className="text-sm text-navy-700/50">No direct sellers yet. Share your referral link.</p>
        )}
        {team.directSellers.map((member) => (
          <div
            key={member.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-navy-700/10 px-3 py-3"
          >
            <div>
              <p className="font-medium text-navy-900">{member.name}</p>
              <p className="text-xs text-navy-700/50">
                {member.sellerCode} · Expected {member.expectedSales ?? '—'} · Joined{' '}
                {formatDate(member.joinedAt)}
              </p>
            </div>
            <Badge tone={statusTone(member.activationStatus)}>{member.activationStatus}</Badge>
          </div>
        ))}
      </Card>

      <Card className="space-y-2 p-4">
        <h2 className="font-display text-lg font-semibold">Hierarchy</h2>
        {team.tree.map((node) => (
          <div
            key={node.id}
            className="rounded-lg bg-surface px-3 py-2 text-sm"
            style={{ marginLeft: `${Math.min(node.level, 4) * 12}px` }}
          >
            <span className="font-medium text-navy-900">{node.name}</span>
            <span className="text-navy-700/50"> · {node.sellerCode}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

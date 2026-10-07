import { cn } from '../../lib/utils';
import { Badge } from './badge';

type Tone = 'navy' | 'orange' | 'green' | 'yellow' | 'red' | 'grey' | 'blue';

const SALE: Record<string, { tone: Tone; label: string }> = {
  PENDING: { tone: 'yellow', label: 'Pending' },
  CONFIRMED: { tone: 'green', label: 'Approved' },
  CANCELLED: { tone: 'red', label: 'Cancelled' },
};

const PAYMENT: Record<string, { tone: Tone; label: string }> = {
  PENDING: { tone: 'yellow', label: 'Payment pending' },
  PARTIAL: { tone: 'orange', label: 'Partial' },
  PAID: { tone: 'green', label: 'Paid' },
};

const DELIVERY: Record<string, { tone: Tone; label: string }> = {
  AWAITING_APPROVAL: { tone: 'yellow', label: 'Awaiting approval' },
  AWAITING_PAYMENT: { tone: 'orange', label: 'Awaiting payment' },
  READY_TO_SEND: { tone: 'blue', label: 'Ready to send' },
  SENT: { tone: 'green', label: 'Sent' },
};

const ACTIVATION: Record<string, { tone: Tone; label: string }> = {
  ACTIVE: { tone: 'green', label: 'Active' },
  PENDING: { tone: 'yellow', label: 'Pending' },
  SUSPENDED: { tone: 'red', label: 'Suspended' },
};

function resolve(
  kind: 'sale' | 'payment' | 'delivery' | 'activation' | 'generic',
  status: string,
) {
  const map =
    kind === 'sale'
      ? SALE
      : kind === 'payment'
        ? PAYMENT
        : kind === 'delivery'
          ? DELIVERY
          : kind === 'activation'
            ? ACTIVATION
            : null;
  if (map && map[status]) return map[status];
  return { tone: 'grey' as Tone, label: status.replace(/_/g, ' ') };
}

export function StatusBadge({
  status,
  kind = 'generic',
  className,
}: {
  status: string;
  kind?: 'sale' | 'payment' | 'delivery' | 'activation' | 'generic';
  className?: string;
}) {
  const { tone, label } = resolve(kind, status);
  return (
    <Badge tone={tone} className={cn('capitalize', className)}>
      {label}
    </Badge>
  );
}

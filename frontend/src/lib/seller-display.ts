import type { SellerActivationStatus } from '../types/seller';
import type { UserRole } from '../types/auth';

export function statusTone(status: SellerActivationStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'green' as const;
    case 'PENDING':
      return 'yellow' as const;
    case 'SUSPENDED':
      return 'red' as const;
    default:
      return 'grey' as const;
  }
}

export function roleTone(role: UserRole) {
  if (role === 'MASTER_SELLER') return 'orange' as const;
  return 'navy' as const;
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

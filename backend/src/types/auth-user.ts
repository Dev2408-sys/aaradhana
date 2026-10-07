import type { UserRole, UserStatus } from '@prisma/client';

export interface AuthUser {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  sellerProfileId?: string | null;
}

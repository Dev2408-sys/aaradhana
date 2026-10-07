export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MASTER_SELLER' | 'SELLER';

export interface SellerProfileSummary {
  id: string;
  sellerCode: string;
  parentSellerId: string | null;
  level: number;
  city: string | null;
  area: string | null;
  activationStatus: string;
}

export interface AuthUser {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  role: UserRole;
  status: string;
  lastLoginAt?: string | null;
  createdAt?: string;
  sellerProfile?: SellerProfileSummary | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  code: string;
}

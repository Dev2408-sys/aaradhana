import type { UserRole } from './auth';

export type SellerActivationStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface SellerParentSummary {
  id: string;
  sellerCode: string;
  name: string;
  mobile: string;
  role: UserRole;
}

export interface Seller {
  id: string;
  userId: string;
  sellerCode: string;
  name: string;
  mobile: string;
  email: string | null;
  role: UserRole;
  userStatus: string;
  parentSellerId: string | null;
  parentSeller: SellerParentSummary | null;
  level: number;
  city: string | null;
  area: string | null;
  instagramHandle: string | null;
  expectedSales: number | null;
  activationStatus: SellerActivationStatus;
  joinedAt: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  teamSummary?: {
    directSellers: number;
    totalTeamSellers: number;
  };
  performanceNote?: string;
}

export interface SellerListResponse {
  items: Seller[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SellerTeamResponse {
  summary: {
    directSellers: number;
    totalTeamSellers: number;
    activeSellers: number;
    pendingSellers: number;
  };
  directSellers: Seller[];
  tree: Array<{
    id: string;
    name: string;
    sellerCode: string;
    parentSellerId: string | null;
    level: number;
    activationStatus: SellerActivationStatus;
    joinedAt: string;
    expectedSales: number | null;
    role: UserRole;
    city: string | null;
  }>;
}

export interface ReferralInfo {
  sellerCode: string;
  sellerName: string;
  role: UserRole;
  city: string | null;
  activationStatus: SellerActivationStatus;
  canAcceptReferrals: boolean;
  event: {
    name: string;
    startDate: string;
    endDate: string;
    venue: string;
    dailyTarget: number;
  } | null;
}

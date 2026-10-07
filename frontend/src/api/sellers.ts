import { apiClient } from './client';
import type { ApiSuccess } from '../types/auth';
import type {
  ReferralInfo,
  Seller,
  SellerActivationStatus,
  SellerListResponse,
  SellerTeamResponse,
} from '../types/seller';
import type { UserRole } from '../types/auth';

export interface SellerListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole;
  status?: SellerActivationStatus;
  city?: string;
  parentSellerId?: string;
  sortBy?: 'createdAt' | 'expectedSales' | 'joinedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export async function listSellers(params: SellerListParams = {}) {
  const { data } = await apiClient.get<ApiSuccess<SellerListResponse>>('/sellers', { params });
  return data.data;
}

export async function getSeller(id: string) {
  const { data } = await apiClient.get<ApiSuccess<Seller>>(`/sellers/${id}`);
  return data.data;
}

export async function createSeller(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<
    ApiSuccess<{ seller: Seller; temporaryPassword: string }>
  >('/sellers', payload);
  return data.data;
}

export async function updateSeller(id: string, payload: Record<string, unknown>) {
  const { data } = await apiClient.patch<ApiSuccess<Seller>>(`/sellers/${id}`, payload);
  return data.data;
}

export async function updateSellerStatus(id: string, activationStatus: SellerActivationStatus) {
  const { data } = await apiClient.patch<ApiSuccess<Seller>>(`/sellers/${id}/status`, {
    activationStatus,
  });
  return data.data;
}

export async function updateSellerParent(id: string, parentSellerId: string | null) {
  const { data } = await apiClient.patch<ApiSuccess<Seller>>(`/sellers/${id}/parent`, {
    parentSellerId,
  });
  return data.data;
}

export async function getSellerTeam(id: string) {
  const { data } = await apiClient.get<ApiSuccess<SellerTeamResponse>>(`/sellers/${id}/team`);
  return data.data;
}

export async function getMySeller() {
  const { data } = await apiClient.get<ApiSuccess<Seller>>('/sellers/me');
  return data.data;
}

export async function updateMySeller(payload: Record<string, unknown>) {
  const { data } = await apiClient.patch<ApiSuccess<Seller>>('/sellers/me', payload);
  return data.data;
}

export async function getReferralLink(id: string) {
  const { data } = await apiClient.get<
    ApiSuccess<{ sellerCode: string; path: string; url: string }>
  >(`/sellers/${id}/referral-link`);
  return data.data;
}

export async function getReferralInfo(sellerCode: string) {
  const { data } = await apiClient.get<ApiSuccess<ReferralInfo>>(
    `/sellers/referral/${sellerCode}`,
  );
  return data.data;
}

export async function registerSeller(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<
    ApiSuccess<{
      seller: Seller;
      temporaryPassword: string | null;
      passwordSetByUser: boolean;
      activationStatus: string;
      message: string;
    }>
  >('/sellers/register', payload);
  return data.data;
}

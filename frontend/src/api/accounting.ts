import { apiClient } from './client';
import type { ApiSuccess } from '../types/auth';

export async function getSellerFinanceSummary(sellerId: string) {
  const { data } = await apiClient.get<ApiSuccess<Record<string, unknown>>>(
    `/accounting/sellers/${sellerId}/summary`,
  );
  return data.data;
}

export async function getSellerLedger(sellerId: string, params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get<
    ApiSuccess<{
      items: Array<{
        id: string;
        entryType: string;
        direction: string;
        amount: number;
        balanceAfter: number | null;
        reference: string;
        description: string;
        createdAt: string;
        sale: { id: string; saleNumber: string } | null;
      }>;
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>
  >(`/accounting/sellers/${sellerId}/ledger`, { params });
  return data.data;
}

export async function getSaleAccountingSummary(saleId: string) {
  const { data } = await apiClient.get<ApiSuccess<Record<string, unknown>>>(
    `/accounting/sales/${saleId}/summary`,
  );
  return data.data;
}

export async function getAdminReceivables(params: { eventDay?: number } = {}) {
  const { data } = await apiClient.get<ApiSuccess<Record<string, unknown>>>(
    '/accounting/receivables',
    { params },
  );
  return data.data;
}

export async function listSellerAccounting(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get<
    ApiSuccess<{
      items: Array<Record<string, unknown>>;
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>
  >('/accounting/sellers', { params });
  return data.data;
}

export async function createCustomerPayment(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<ApiSuccess<Record<string, unknown>>>(
    '/customer-payments',
    payload,
  );
  return data.data;
}

export async function listCustomerPayments(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get<
    ApiSuccess<{ items: Array<Record<string, unknown>>; pagination: Record<string, number> }>
  >('/customer-payments', { params });
  return data.data;
}

export async function reverseCustomerPayment(id: string) {
  const { data } = await apiClient.post<ApiSuccess<Record<string, unknown>>>(
    `/customer-payments/${id}/reverse`,
  );
  return data.data;
}

export async function createSellerPayment(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<ApiSuccess<Record<string, unknown>>>(
    '/seller-payments',
    payload,
  );
  return data.data;
}

export async function listSellerPayments(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get<
    ApiSuccess<{ items: Array<Record<string, unknown>>; pagination: Record<string, number> }>
  >('/seller-payments', { params });
  return data.data;
}

export async function reverseSellerPayment(id: string) {
  const { data } = await apiClient.post<ApiSuccess<Record<string, unknown>>>(
    `/seller-payments/${id}/reverse`,
  );
  return data.data;
}

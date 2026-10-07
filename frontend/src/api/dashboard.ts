import { apiClient } from './client';
import type { ApiSuccess } from '../types/auth';

export type DashboardQuery = {
  eventId?: string;
  eventDay?: number | '';
  eventDayId?: string;
  startDate?: string;
  endDate?: string;
  sellerId?: string;
  masterSellerId?: string;
  ticketTypeId?: string;
  paymentStatus?: string;
  settlementStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
};

function params(q: DashboardQuery = {}) {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v as string | number;
  }
  return out;
}

async function get<T>(path: string, query?: DashboardQuery) {
  const { data } = await apiClient.get<ApiSuccess<T>>(path, { params: params(query) });
  return data.data;
}

export const fetchAdminSummary = (q?: DashboardQuery) =>
  get<Record<string, unknown>>('/dashboard/admin/summary', q);
export const fetchAdminDaily = (q?: DashboardQuery) =>
  get<{ dailyTarget: number; days: Array<Record<string, number | string>> }>(
    '/dashboard/admin/daily-performance',
    q,
  );
export const fetchAdminTopSellers = (q?: DashboardQuery) =>
  get<{ scopeLabel: string; items: Array<Record<string, unknown>> }>(
    '/dashboard/admin/top-sellers',
    q,
  );
export const fetchAdminTopMasters = (q?: DashboardQuery) =>
  get<{ items: Array<Record<string, unknown>> }>('/dashboard/admin/top-masters', q);
export const fetchAdminTicketMix = (q?: DashboardQuery) =>
  get<Record<string, number>>('/dashboard/admin/ticket-mix', q);
export const fetchAdminPayments = (q?: DashboardQuery) =>
  get<{ slices: Array<Record<string, unknown>> }>('/dashboard/admin/payment-summary', q);
export const fetchAdminSettlements = (q?: DashboardQuery) =>
  get<{ slices: Array<Record<string, unknown>> }>('/dashboard/admin/settlement-summary', q);
export const fetchAdminRecentSales = (q?: DashboardQuery) =>
  get<{ items: Array<Record<string, unknown>> }>('/dashboard/admin/recent-sales', q);
export const fetchAdminRecentPayments = (q?: DashboardQuery) =>
  get<{ items: Array<Record<string, unknown>> }>('/dashboard/admin/recent-payments', q);
export const fetchAdminPulse = (q?: DashboardQuery) =>
  get<Record<string, unknown>>('/dashboard/admin/event-pulse', q);
export const fetchAdminTarget = (q?: DashboardQuery) =>
  get<Record<string, unknown>>('/dashboard/admin/target-progress', q);
export const fetchAdminSellerPerf = (q?: DashboardQuery) =>
  get<{ items: Array<Record<string, unknown>>; total: number; page: number; totalPages: number }>(
    '/dashboard/admin/seller-performance',
    q,
  );
export const fetchAdminAlerts = (q?: DashboardQuery) =>
  get<{
    customerOutstanding: Array<Record<string, unknown>>;
    sellerOutstanding: Array<Record<string, unknown>>;
  }>('/dashboard/admin/outstanding-alerts', q);
export const fetchAdminHealth = (q?: DashboardQuery) =>
  get<{ status: string; reasons: string[]; calculation: Record<string, unknown> }>(
    '/dashboard/admin/event-health',
    q,
  );

export const fetchSellerSummary = (q?: DashboardQuery) =>
  get<{ my: Record<string, number>; eventDay: number | null }>('/dashboard/seller/summary', q);
export const fetchSellerDaily = (q?: DashboardQuery) =>
  get<{ days: Array<{ dayNumber: number; ticketsSold: number; salesValue: number }> }>(
    '/dashboard/seller/daily-performance',
    q,
  );
export const fetchSellerTicketMix = (q?: DashboardQuery) =>
  get<Record<string, number>>('/dashboard/seller/ticket-mix', q);
export const fetchSellerRecentSales = (q?: DashboardQuery) =>
  get<{ items: Array<Record<string, unknown>> }>('/dashboard/seller/recent-sales', q);
export const fetchSellerFinance = (q?: DashboardQuery) =>
  get<Record<string, unknown>>('/dashboard/seller/finance', q);

export const fetchMasterSummary = (q?: DashboardQuery) =>
  get<Record<string, number>>('/dashboard/master/summary', q);
export const fetchMasterTeam = (q?: DashboardQuery) =>
  get<{ items: Array<Record<string, unknown>> }>('/dashboard/master/team-performance', q);

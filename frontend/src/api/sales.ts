import { apiClient } from './client';
import type { ApiSuccess } from '../types/auth';

export interface SaleSummary {
  id: string;
  saleNumber: string;
  seller: { id: string; sellerCode: string; name: string; mobile: string };
  customer: {
    id: string;
    name: string;
    mobile: string;
    email: string | null;
    city: string | null;
  };
  eventDay: number | null;
  totalQuantity: number;
  goldCount: number;
  vipCount: number;
  totalAmount: number;
  baseAmount: number;
  sellerProfit: number;
  customerPaymentStatus: string;
  settlementStatus: string;
  saleStatus: string;
  deliveryStatus: string;
  adminPaymentUtr?: string | null;
  adminPaymentProofUrl?: string | null;
  approvedAt?: string | null;
  ticketsTransferredAt?: string | null;
  whatsappSentAt?: string | null;
  rejectedReason?: string | null;
  soldAt: string;
  items: Array<{
    id: string;
    ticketId: string;
    ticketNumber: string;
    ticketTypeCode: string;
    zone: string;
    sellingPrice: number;
    basePrice: number;
    sellerMargin: number;
    status: string;
  }>;
  tickets: Array<{
    id: string;
    ticketNumber: string;
    status: string;
    zone: string | null;
  }>;
}

export interface TicketTypeOption {
  id: string;
  name: string;
  code: string;
  numberPrefix: string;
  basePrice: string | number;
  minimumPrice: string | number | null;
  issuedCount: number;
  dayPricing?: Array<{
    dayNumber: number;
    basePrice: number;
    minimumSellingPrice: number;
    suggestedSellingPrice: number;
  }>;
}

export async function fetchTicketTypes() {
  const { data } = await apiClient.get<
    ApiSuccess<{
      event: {
        id: string;
        name: string;
        dailyTarget: number;
        venue?: string;
        suggestedDay?: number | null;
        days?: Array<{ day: number; date: string; label: string; shortLabel: string }>;
      };
      ticketTypes: TicketTypeOption[];
    }>
  >('/ticket-types');
  return data.data;
}

export async function createSale(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<ApiSuccess<SaleSummary>>('/sales', payload);
  return data.data;
}

export async function listSales(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get<
    ApiSuccess<{
      items: SaleSummary[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>
  >('/sales', { params });
  return data.data;
}

export async function getSale(id: string) {
  const { data } = await apiClient.get<ApiSuccess<SaleSummary>>(`/sales/${id}`);
  return data.data;
}

export async function approveSale(
  id: string,
  payload: {
    confirmCustomerName: string;
    confirmCustomerMobile: string;
    notes?: string | null;
  },
) {
  const { data } = await apiClient.post<ApiSuccess<SaleSummary>>(
    `/sales/${id}/approve`,
    payload,
  );
  return data.data;
}

export async function rejectSale(id: string, reason?: string | null) {
  const { data } = await apiClient.post<ApiSuccess<SaleSummary>>(`/sales/${id}/reject`, {
    reason,
  });
  return data.data;
}

export async function markWhatsAppSent(id: string) {
  const { data } = await apiClient.post<ApiSuccess<SaleSummary>>(
    `/sales/${id}/mark-whatsapp-sent`,
  );
  return data.data;
}

export async function getSaleSlip(id: string) {
  const { data } = await apiClient.get<
    ApiSuccess<{
      sale: SaleSummary;
      slip: Record<string, unknown>;
      whatsapp: { message: string; link: string; canSend: boolean };
    }>
  >(`/sales/${id}/slip`);
  return data.data;
}

export interface TicketRecord {
  id: string;
  ticketNumber: string;
  zone: string;
  status: string;
  ticketType: { id: string; code: string; name: string };
  seller: { id: string; sellerCode: string; name: string } | null;
  customer: { id: string; name: string; mobile: string } | null;
  sale: { id: string; saleNumber: string } | null;
  sellingPrice: number | null;
  basePrice: number | null;
  sellerMargin: number | null;
  issuedAt: string | null;
  soldAt: string | null;
  createdAt: string;
}

export async function listTickets(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get<
    ApiSuccess<{
      items: TicketRecord[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>
  >('/tickets', { params });
  return data.data;
}

export async function getTicketStats() {
  const { data } = await apiClient.get<
    ApiSuccess<{
      totalIssued: number;
      goldIssued: number;
      vipIssued: number;
      todayIssued: number;
    }>
  >('/tickets/stats');
  return data.data;
}

export async function getSalesSummary() {
  const { data } = await apiClient.get<ApiSuccess<Record<string, unknown>>>(
    '/dashboard/sales-summary',
  );
  return data.data;
}

export async function searchCustomers(q: string) {
  const { data } = await apiClient.get<
    ApiSuccess<{ items: Array<{ id: string; name: string; mobile: string }> }>
  >('/customers/search', { params: { q } });
  return data.data;
}

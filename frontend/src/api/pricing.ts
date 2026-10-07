import { apiClient } from './client';
import type { ApiSuccess } from '../types/auth';

export type DayPriceRow = {
  ticketTypeId: string;
  ticketTypeCode: string;
  basePrice: number;
  minimumSellingPrice: number;
  suggestedSellingPrice: number;
};

export type PricingPayload = {
  event: { id: string; name: string; timezone: string };
  ticketTypes: Array<{
    id: string;
    code: string;
    name: string;
    defaultBasePrice: number;
  }>;
  days: Array<{
    id: string;
    dayNumber: number;
    date: string;
    label: string;
    displayLabel: string;
    prices: DayPriceRow[];
  }>;
};

export async function getDayPricing() {
  const { data } = await apiClient.get<ApiSuccess<PricingPayload>>('/pricing');
  return data.data;
}

export async function saveDayPricing(
  rows: Array<{
    dayNumber: number;
    ticketTypeId: string;
    basePrice: number;
    minimumSellingPrice?: number | null;
    suggestedSellingPrice?: number | null;
  }>,
) {
  const { data } = await apiClient.put<ApiSuccess<PricingPayload>>('/pricing', { rows });
  return data.data;
}

export type UpiAccountRow = {
  id: string;
  label: string;
  upiId: string;
  payeeName: string;
  qrImageUrl: string | null;
  instructions: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  isMain: boolean;
  isReceiving: boolean;
  rotateLimitAmount: number;
  sortOrder: number;
  approvedCount: number;
  receivedBase: number;
  remainingToLimit: number;
};

export type PaymentSettings = {
  event: { id: string; name: string };
  upiId: string | null;
  upiPayeeName: string | null;
  upiInstructions: string | null;
  upiQrImageUrl: string | null;
  upiDeepLink: string | null;
  qrCodeDataUrl: string | null;
  displayQrUrl: string | null;
  supportWhatsapp: string | null;
  requireUtrForUpi: boolean;
  defaultRotateLimitAmount: number;
  canEdit: boolean;
  receivingAccount: UpiAccountRow | null;
  accounts?: UpiAccountRow[];
  statsDate?: string;
};

export type UpiStatsPayload = {
  date: string;
  accounts: UpiAccountRow[];
};

export async function getPaymentSettings(amount?: number) {
  const { data } = await apiClient.get<ApiSuccess<PaymentSettings>>('/payment-settings', {
    params: amount != null && amount > 0 ? { amount } : undefined,
  });
  return data.data;
}

export async function updatePaymentSettings(payload: Record<string, unknown>) {
  const { data } = await apiClient.put<ApiSuccess<PaymentSettings>>(
    '/payment-settings',
    payload,
  );
  return data.data;
}

export async function getUpiStats(date?: string) {
  const { data } = await apiClient.get<ApiSuccess<UpiStatsPayload>>(
    '/payment-settings/upi-stats',
    { params: date ? { date } : undefined },
  );
  return data.data;
}

export async function createUpiAccount(payload: {
  label: string;
  upiId: string;
  payeeName: string;
  qrImageUrl?: string | null;
  instructions?: string | null;
  rotateLimitAmount?: number | null;
  setAsMain?: boolean;
}) {
  const { data } = await apiClient.post<ApiSuccess<UpiAccountRow>>(
    '/payment-settings/accounts',
    payload,
  );
  return data.data;
}

export async function updateUpiAccount(
  id: string,
  payload: {
    label?: string;
    upiId?: string;
    payeeName?: string;
    qrImageUrl?: string | null;
    instructions?: string | null;
    rotateLimitAmount?: number | null;
    status?: 'ACTIVE' | 'INACTIVE';
  },
) {
  const { data } = await apiClient.patch<ApiSuccess<UpiAccountRow>>(
    `/payment-settings/accounts/${id}`,
    payload,
  );
  return data.data;
}

export async function setMainUpiAccount(id: string) {
  const { data } = await apiClient.post<ApiSuccess<UpiStatsPayload>>(
    `/payment-settings/accounts/${id}/set-main`,
  );
  return data.data;
}

export async function setReceivingUpiAccount(id: string) {
  const { data } = await apiClient.post<ApiSuccess<UpiStatsPayload>>(
    `/payment-settings/accounts/${id}/set-receiving`,
  );
  return data.data;
}

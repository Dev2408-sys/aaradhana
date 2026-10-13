import { apiClient } from './client';

export type WhatsappStatus = {
  configured: boolean;
  apiUrl: string;
  phoneIdLast4: string;
  fromDisplay: string;
  usingTestNumber: boolean;
  devMode: boolean;
  maxNumbers: number;
};

export type BulkSendResult = {
  to: string;
  ok: boolean;
  messageId?: string;
  error?: string;
  code?: number;
};

export type BulkSendResponse = {
  sent: number;
  failed: number;
  invalid: string[];
  duplicatesSkipped: number;
  devMode: boolean;
  results: BulkSendResult[];
};

export async function fetchWhatsappStatus() {
  const { data } = await apiClient.get('/whatsapp/status');
  return data.data as WhatsappStatus;
}

export async function sendWhatsappBulk(form: FormData) {
  const { data } = await apiClient.post('/whatsapp/bulk', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180_000,
  });
  return data.data as BulkSendResponse;
}

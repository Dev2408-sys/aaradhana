import { apiClient, getAccessToken } from './client';
import type { ApiSuccess } from '../types/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export async function uploadPaymentProof(file: File) {
  const form = new FormData();
  form.append('file', file);
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/uploads/payment-proof`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const json = (await res.json()) as ApiSuccess<{ url: string }> & {
    success: boolean;
    message?: string;
  };
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Upload failed');
  }
  return json.data;
}

export async function uploadUpiQr(file: File) {
  const form = new FormData();
  form.append('file', file);
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/uploads/upi-qr`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const json = (await res.json()) as ApiSuccess<{ url: string }> & {
    success: boolean;
    message?: string;
  };
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Upload failed');
  }
  return json.data;
}

/** Prefer fetch helpers above; axios multipart can set wrong Content-Type */
export async function uploadPaymentProofAxios(file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<ApiSuccess<{ url: string }>>(
    '/uploads/payment-proof',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

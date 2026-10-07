import { apiClient } from './client';
import type { ApiSuccess, AuthUser, LoginResponse } from '../types/auth';

export async function loginRequest(mobile: string, password: string) {
  const { data } = await apiClient.post<ApiSuccess<LoginResponse>>('/auth/login', {
    mobile,
    password,
  });
  return data.data;
}

export async function logoutRequest(refreshToken?: string | null) {
  await apiClient.post('/auth/logout', { refreshToken: refreshToken ?? undefined });
}

export async function meRequest() {
  const { data } = await apiClient.get<ApiSuccess<AuthUser>>('/auth/me');
  return data.data;
}

export async function healthRequest() {
  const { data } = await apiClient.get<{ success: boolean; message: string }>('/health');
  return data;
}

export async function changePasswordRequest(currentPassword: string, newPassword: string) {
  const { data } = await apiClient.post<ApiSuccess<{ changed: boolean }>>(
    '/auth/change-password',
    { currentPassword, newPassword },
  );
  return data.data;
}

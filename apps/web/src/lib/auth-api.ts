import { apiRequest } from './api-client';
import type { AuthUser } from '@/stores/auth.store';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: TokenPair;
  isNewUser: boolean;
}

export const authApi = {
  requestOtp: (phone: string, purpose = 'LOGIN') =>
    apiRequest<{ message: string; expiresIn: number }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose }),
    }),

  verifyOtp: (phone: string, code: string, purpose = 'LOGIN') =>
    apiRequest<AuthResponse>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code, purpose }),
    }),

  register: (body: Record<string, unknown>) =>
    apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  refresh: (refreshToken: string) =>
    apiRequest<TokenPair>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  getMe: (accessToken: string) =>
    apiRequest<AuthUser & { profile: AuthUser['profile'] }>('/users/me', {
      accessToken,
    }),

  logout: (accessToken: string, refreshToken?: string) =>
    apiRequest('/auth/logout', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ refreshToken }),
    }),
};

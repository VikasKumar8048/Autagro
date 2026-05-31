import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'SELLER' | 'BUYER' | 'TRANSPORTER' | 'ADMIN';

export interface AuthUser {
  id: string;
  phone: string;
  email: string | null;
  role: UserRole;
  status: string;
  profile: {
    fullName: string;
    state: string;
    district: string;
    pincode: string;
  } | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (payload: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
      isAuthenticated: () => Boolean(get().accessToken && get().user?.id),
    }),
    { name: 'farmora-auth' },
  ),
);

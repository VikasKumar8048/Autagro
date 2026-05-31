'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';

const ROLE_HOME: Record<string, string> = {
  SELLER: '/seller',
  BUYER: '/buyer',
  TRANSPORTER: '/transporter',
  ADMIN: '/dashboard',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    if (user?.role) {
      const home = ROLE_HOME[user.role] ?? '/marketplace';
      if (home !== '/dashboard') {
        router.replace(home);
      }
    }
  }, [isAuthenticated, router, user]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <p className="text-slate-500">Redirecting…</p>
    </main>
  );
}

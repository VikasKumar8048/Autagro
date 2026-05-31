'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore, type UserRole } from '@/stores/auth.store';

export function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    if (roles && user && !roles.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router, roles, user]);

  if (!isAuthenticated() || (roles && user && !roles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
}

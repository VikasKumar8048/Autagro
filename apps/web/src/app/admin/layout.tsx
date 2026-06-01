'use client';

import { AppShell } from '@/components/layout/app-shell';
import { RequireAuth } from '@/components/auth/require-auth';

const NAV = [
  { href: '/admin/disputes', label: 'Disputes' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/profile', label: 'Profile' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={['ADMIN']}>
      <AppShell nav={NAV}>{children}</AppShell>
    </RequireAuth>
  );
}

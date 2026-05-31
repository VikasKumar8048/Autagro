'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth.store';

const ROLE_DASHBOARD: Record<string, { title: string; description: string }> = {
  SELLER: {
    title: 'Seller Dashboard',
    description: 'Phase 2: crop listings, buyer requests, earnings.',
  },
  BUYER: {
    title: 'Buyer Dashboard',
    description: 'Phase 3: marketplace, orders, payments.',
  },
  TRANSPORTER: {
    title: 'Transporter Dashboard',
    description: 'Phase 5: available jobs, GPS tracking, earnings.',
  },
  ADMIN: {
    title: 'Admin Dashboard',
    description: 'Phase 12: users, disputes, platform reports.',
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  const { data: me } = useQuery({
    queryKey: ['me', accessToken],
    queryFn: () => authApi.getMe(accessToken!),
    enabled: Boolean(accessToken),
  });

  if (!user) {
    return null;
  }

  const panel = ROLE_DASHBOARD[user.role] ?? ROLE_DASHBOARD.BUYER;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">FARMORA</h1>
          <p className="text-slate-600">Welcome, {me?.profile?.fullName ?? user.profile?.fullName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/profile">Profile</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              clearAuth();
              router.push('/login');
            }}
          >
            Logout
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{panel.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-600">
          <p>{panel.description}</p>
          <p>
            <span className="font-medium text-slate-800">Role:</span> {user.role}
          </p>
          <p>
            <span className="font-medium text-slate-800">Status:</span> {user.status}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

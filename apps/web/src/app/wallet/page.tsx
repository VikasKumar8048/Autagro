'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { paymentsApi } from '@/lib/payments-api';
import { useAuthStore } from '@/stores/auth.store';

export default function WalletPage() {
  const router = useRouter();
  const { accessToken, user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => paymentsApi.wallet(accessToken!),
    enabled: Boolean(accessToken),
  });

  if (!user) return null;

  const home =
    user.role === 'SELLER'
      ? '/seller'
      : user.role === 'BUYER'
        ? '/buyer'
        : user.role === 'TRANSPORTER'
          ? '/transporter'
          : '/dashboard';

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <Link href={home} className="text-sm text-emerald-700">
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-bold">AgriPay Wallet</h1>

      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-800">
                ₹{(data?.balance ?? 0).toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-slate-500">{data?.currency ?? 'INR'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent settlements</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.transactions?.length ? (
                <p className="text-sm text-slate-500">No transactions yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {data.transactions.map((t) => (
                    <li key={t.id} className="flex justify-between py-2">
                      <span>
                        {t.type.replace(/_/g, ' ')}
                        {t.orderId && (
                          <span className="block text-xs text-slate-400">
                            Order {t.orderId.slice(0, 8)}…
                          </span>
                        )}
                      </span>
                      <span
                        className={
                          t.direction === 'CREDIT' ? 'text-emerald-700' : 'text-red-600'
                        }
                      >
                        {t.direction === 'CREDIT' ? '+' : '-'}₹
                        {t.amount.toLocaleString('en-IN')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

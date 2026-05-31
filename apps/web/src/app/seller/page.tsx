'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sellerApi } from '@/lib/seller-api';
import { useAuthStore } from '@/stores/auth.store';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-emerald-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function SellerDashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken)!;

  const { data, isLoading } = useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: () => sellerApi.dashboard(accessToken),
  });

  if (isLoading) {
    return <p className="text-slate-500">Loading dashboard…</p>;
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Seller Dashboard</h1>
        <Button asChild>
          <Link href="/seller/listings/new">+ New listing</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total listings" value={stats?.totalListings ?? 0} />
        <StatCard label="Active listings" value={stats?.activeListings ?? 0} />
        <StatCard label="Sold listings" value={stats?.soldListings ?? 0} />
        <StatCard label="Pending requests" value={stats?.pendingRequests ?? 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Awaiting buyer confirm" value={stats?.acceptedOrders ?? 0} />
        <StatCard
          label="Total earnings (completed)"
          value={`₹${(stats?.totalEarnings ?? 0).toLocaleString('en-IN')}`}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent purchase requests</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/seller/requests">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!data?.recentRequests?.length ? (
            <p className="text-sm text-slate-500">No pending requests yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentRequests.map((r) => (
                <li key={r.id} className="flex justify-between py-3 text-sm">
                  <span>
                    <strong>{r.cropName}</strong> ({r.variety}) — {r.quantity} from{' '}
                    {r.buyerName}
                  </span>
                  <span className="text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

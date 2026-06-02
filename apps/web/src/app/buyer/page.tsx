'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { PriceInsightsCard } from '@/components/pricing/price-insights-card';
import { buyerApi } from '@/lib/buyer-api';
import { useAuthStore } from '@/stores/auth.store';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-emerald-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function BuyerDashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken)!;

  const { data, isLoading } = useQuery({
    queryKey: ['buyer-dashboard'],
    queryFn: () => buyerApi.dashboard(accessToken),
  });

  if (isLoading) {
    return <p className="text-slate-500">Loading…</p>;
  }

  const stats = data?.stats;
  const topCrop = data?.recentOrders?.[0]?.cropName ?? 'Wheat';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Buyer Dashboard</h1>
        <Button asChild>
          <Link href="/marketplace">Browse crops</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending requests" value={stats?.pendingRequests ?? 0} />
        <StatCard label="Awaiting your confirm" value={stats?.awaitingConfirmation ?? 0} />
        <StatCard label="Active orders" value={stats?.activeOrders ?? 0} />
        <StatCard label="Completed" value={stats?.completedOrders ?? 0} />
      </div>

      {!!stats?.awaitingConfirmation && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <p className="text-sm text-amber-900">
              You have {stats.awaitingConfirmation} order(s) waiting for your confirmation.
            </p>
            <Button size="sm" asChild>
              <Link href="/buyer/orders?status=SELLER_ACCEPTED">Review orders</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent orders</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/buyer/orders">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!data?.recentOrders?.length ? (
            <p className="text-sm text-slate-500">No orders yet. Browse the marketplace to get started.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-3">
                  <Link href={`/buyer/orders/${o.id}`} className="text-sm hover:text-emerald-700">
                    <strong>{o.cropName}</strong> ({o.variety}) — ₹
                    {o.cropAmount.toLocaleString('en-IN')}
                  </Link>
                  <OrderStatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PriceInsightsCard cropName={topCrop} />
    </div>
  );
}

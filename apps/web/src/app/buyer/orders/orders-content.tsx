'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { buyerApi } from '@/lib/buyer-api';
import { useAuthStore } from '@/stores/auth.store';

export function BuyerOrdersContent() {
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? undefined;

  const { data: orders, isLoading } = useQuery({
    queryKey: ['buyer-orders', status],
    queryFn: () => buyerApi.orders(accessToken, status),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My orders</h1>

      <div className="flex flex-wrap gap-2 text-sm">
        {['', 'SELLER_ACCEPTED', 'TRANSPORT_PENDING', 'IN_TRANSIT', 'COMPLETED'].map((s) => (
          <Link
            key={s || 'all'}
            href={s ? `/buyer/orders?status=${s}` : '/buyer/orders'}
            className={`rounded-lg px-3 py-1 ${
              (status ?? '') === s
                ? 'bg-emerald-700 text-white'
                : 'bg-white text-slate-600 ring-1 ring-emerald-100'
            }`}
          >
            {s ? s.replace(/_/g, ' ') : 'All'}
          </Link>
        ))}
      </div>

      {isLoading && <p className="text-slate-500">Loading…</p>}

      <div className="space-y-4">
        {orders?.map((order) => (
          <Link key={order.id} href={`/buyer/orders/${order.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {order.listing.cropName} — {order.listing.variety}
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    {order.quantity} {order.listing.unit} · Seller: {order.sellerName}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-emerald-800">
                  ₹{order.cropAmount.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!isLoading && !orders?.length && (
          <p className="text-slate-500">No orders in this category.</p>
        )}
      </div>
    </div>
  );
}

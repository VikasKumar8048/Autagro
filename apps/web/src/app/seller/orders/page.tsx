'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { apiRequest } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

interface SellerOrder {
  id: string;
  status: string;
  cropAmount: number;
  quantity: number;
  listing: { cropName: string; variety: string; unit: string };
  buyerName?: string;
  createdAt: string;
}

export default function SellerOrdersPage() {
  const accessToken = useAuthStore((s) => s.accessToken)!;

  const { data: orders, isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () =>
      apiRequest<SellerOrder[]>('/seller/orders', { accessToken }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>
      {isLoading && <p className="text-slate-500">Loading…</p>}
      <div className="space-y-4">
        {orders?.map((order) => (
          <Card key={order.id}>
            <CardHeader className="flex flex-row justify-between">
              <CardTitle className="text-lg">
                {order.listing.cropName} — {order.listing.variety}
              </CardTitle>
              <OrderStatusBadge status={order.status} />
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p>
                Buyer: {order.buyerName} · {order.quantity} {order.listing.unit}
              </p>
              <p className="font-semibold text-emerald-800">
                ₹{order.cropAmount.toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !orders?.length && (
          <p className="text-slate-500">No orders yet.</p>
        )}
      </div>
    </div>
  );
}

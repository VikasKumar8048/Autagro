'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { trackingApi } from '@/lib/transporter-api';

export function ShipmentTracker({
  accessToken,
  orderId,
}: {
  accessToken: string;
  orderId: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['tracking', orderId],
    queryFn: () => trackingApi.getOrderTracking(accessToken, orderId),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading tracking…</p>;
  }

  if (!data?.shipment && !data?.transportJob) {
    return null;
  }

  const lastPoint = data.route[data.route.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Shipment tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex gap-2">
          <span className="text-slate-500">Order:</span>
          <OrderStatusBadge status={data.orderStatus} />
        </div>
        {data.transportJob && (
          <p>
            Transport: <OrderStatusBadge status={data.transportJob.status} />
          </p>
        )}
        {data.shipment && (
          <p>
            Shipment: <OrderStatusBadge status={data.shipment.status} />
          </p>
        )}
        {lastPoint ? (
          <p className="rounded-lg bg-emerald-50 p-3">
            Latest location: {lastPoint.lat.toFixed(4)}, {lastPoint.lng.toFixed(4)}
            <br />
            <span className="text-xs text-slate-500">
              {new Date(lastPoint.recordedAt).toLocaleString()}
            </span>
          </p>
        ) : (
          <p className="text-slate-500">GPS updates will appear once transit starts.</p>
        )}
        {data.route.length > 1 && (
          <p className="text-xs text-slate-400">{data.route.length} GPS points recorded</p>
        )}
      </CardContent>
    </Card>
  );
}

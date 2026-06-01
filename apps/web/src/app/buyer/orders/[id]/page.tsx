'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { OpenDisputeForm } from '@/components/disputes/open-dispute-form';
import { EscrowPaymentPanel } from '@/components/payments/escrow-payment-panel';
import { ShipmentTracker } from '@/components/tracking/shipment-tracker';
import { buyerApi } from '@/lib/buyer-api';
import { useAuthStore } from '@/stores/auth.store';

export default function BuyerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken)!;

  const { data: order, isLoading } = useQuery({
    queryKey: ['buyer-order', id],
    queryFn: () => buyerApi.order(accessToken, id),
  });

  const confirmMutation = useMutation({
    mutationFn: () => buyerApi.confirmOrder(accessToken, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-order', id] });
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-dashboard'] });
    },
  });

  const deliveryMutation = useMutation({
    mutationFn: () => buyerApi.confirmDelivery(accessToken, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-order', id] });
      queryClient.invalidateQueries({ queryKey: ['tracking', id] });
    },
  });

  if (isLoading || !order) {
    return <p className="text-slate-500">Loading order…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/buyer/orders" className="text-sm text-emerald-700">
        ← Back to orders
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>
              {order.listing.cropName} — {order.listing.variety}
            </CardTitle>
            <p className="text-slate-500">
              Grade {order.listing.grade} · {order.listing.district}, {order.listing.state}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <p>
              <span className="text-slate-500">Quantity:</span>{' '}
              <strong>
                {order.quantity} {order.listing.unit}
              </strong>
            </p>
            <p>
              <span className="text-slate-500">Crop amount:</span>{' '}
              <strong>₹{order.cropAmount.toLocaleString('en-IN')}</strong>
            </p>
            <p>
              <span className="text-slate-500">Seller:</span> <strong>{order.seller.fullName}</strong>
            </p>
            <p>
              <span className="text-slate-500">Phone:</span> {order.seller.phone}
            </p>
          </div>

          {order.message && (
            <p className="rounded-lg bg-slate-50 p-3">Your message: {order.message}</p>
          )}

          {order.transportJob && (
            <p className="text-slate-600">
              Transport: <OrderStatusBadge status={order.transportJob.status} />
            </p>
          )}

          {order.nextAction === 'CONFIRM_ORDER' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="mb-3 text-amber-900">
                The seller accepted your request. Confirm to proceed — we will start matching
                nearby transporters.
              </p>
              <Button
                disabled={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
              >
                {confirmMutation.isPending ? 'Confirming…' : 'Confirm order'}
              </Button>
              {confirmMutation.isError && (
                <p className="mt-2 text-red-600">{confirmMutation.error.message}</p>
              )}
            </div>
          )}

          {order.status === 'TRANSPORT_PENDING' && (
            <p className="text-slate-600">
              Order confirmed. Waiting for a transporter to accept this job.
            </p>
          )}

          {order.status === 'DELIVERED' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="mb-3 text-emerald-900">
                Crop delivered. Confirm receipt to release escrow to the seller and transporter.
              </p>
              <Button
                disabled={deliveryMutation.isPending}
                onClick={() => deliveryMutation.mutate()}
              >
                {deliveryMutation.isPending ? 'Confirming…' : 'Confirm delivery received'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <EscrowPaymentPanel accessToken={accessToken} orderId={id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dispute</CardTitle>
        </CardHeader>
        <CardContent>
          <OpenDisputeForm
            orderId={id}
            disabled={
              order.status === 'DISPUTED' ||
              order.status === 'COMPLETED' ||
              order.status === 'CANCELLED' ||
              !['PAID_ESCROW', 'IN_TRANSIT', 'DELIVERED', 'TRANSPORT_ASSIGNED'].includes(
                order.status,
              )
            }
          />
        </CardContent>
      </Card>

      {['TRANSPORT_ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'TRANSPORT_PENDING', 'PAID_ESCROW'].includes(
        order.status,
      ) && <ShipmentTracker accessToken={accessToken} orderId={id} />}
    </div>
  );
}

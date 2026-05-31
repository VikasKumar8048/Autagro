'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { buyerApi } from '@/lib/buyer-api';
import { useAuthStore } from '@/stores/auth.store';

export default function BuyerRequestsPage() {
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['buyer-requests'],
    queryFn: () => buyerApi.requests(accessToken),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => buyerApi.cancelRequest(accessToken, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buyer-requests'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My purchase requests</h1>
        <Button asChild>
          <Link href="/marketplace">Browse marketplace</Link>
        </Button>
      </div>

      {isLoading && <p className="text-slate-500">Loading…</p>}

      <div className="space-y-4">
        {requests?.map((req) => (
          <Card key={req.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>
                  {req.listing.cropName} ({req.listing.variety})
                </CardTitle>
                <p className="text-sm text-slate-500">
                  {req.quantity} {req.listing.unit} · Est. ₹
                  {req.estimatedTotal.toLocaleString('en-IN')}
                </p>
              </div>
              <OrderStatusBadge status={req.status} />
            </CardHeader>
            <CardContent className="flex justify-between gap-4">
              {req.message && <p className="text-sm text-slate-600">{req.message}</p>}
              {req.status === 'PENDING' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(req.id)}
                >
                  Cancel
                </Button>
              )}
              {req.status === 'ACCEPTED' && (
                <Button size="sm" asChild>
                  <Link href="/buyer/orders?status=SELLER_ACCEPTED">View order</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {!isLoading && !requests?.length && (
          <p className="text-slate-500">No purchase requests yet.</p>
        )}
      </div>
    </div>
  );
}

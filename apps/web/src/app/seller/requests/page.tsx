'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sellerApi } from '@/lib/seller-api';
import { useAuthStore } from '@/stores/auth.store';

export default function SellerRequestsPage() {
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['seller-requests'],
    queryFn: () => sellerApi.requests(accessToken, 'PENDING'),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => sellerApi.acceptRequest(accessToken, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-requests'] });
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => sellerApi.rejectRequest(accessToken, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seller-requests'] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Buyer requests</h1>
      {isLoading && <p className="text-slate-500">Loading…</p>}

      <div className="space-y-4">
        {requests?.map((req) => (
          <Card key={req.id}>
            <CardHeader>
              <CardTitle>
                {req.listing.cropName} ({req.listing.variety})
              </CardTitle>
              <p className="text-sm text-slate-500">
                From {req.buyer.fullName} · {req.quantity} {req.listing.unit} · Est. ₹
                {req.estimatedTotal.toLocaleString('en-IN')}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {req.message && (
                <p className="rounded-lg bg-slate-50 p-3 text-sm">{req.message}</p>
              )}
              <div className="flex gap-2">
                <Button
                  disabled={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate(req.id)}
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  disabled={rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate(req.id)}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !requests?.length && (
          <p className="text-slate-500">No pending buyer requests.</p>
        )}
      </div>
    </div>
  );
}

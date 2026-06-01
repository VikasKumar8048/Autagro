'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { disputesApi } from '@/lib/disputes-api';
import { useAuthStore } from '@/stores/auth.store';

export default function AdminDisputesPage() {
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const queryClient = useQueryClient();

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: () => disputesApi.adminList(accessToken),
  });

  const resolve = useMutation({
    mutationFn: (args: {
      id: string;
      status: string;
      outcome?: 'REFUND_BUYER' | 'RELEASE_SELLER' | 'REJECT';
      resolution?: string;
    }) => disputesApi.adminResolve(accessToken, args.id, args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-disputes'] }),
  });

  if (isLoading) {
    return <p className="text-slate-500">Loading disputes…</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dispute queue</h1>
      {!disputes?.length ? (
        <p className="text-slate-500">No disputes.</p>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {d.cropName ?? 'Order'} · {d.type} · {d.status}
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Order {d.orderId.slice(0, 8)}… · {new Date(d.createdAt).toLocaleString()}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-700">{d.description}</p>
                {d.status === 'OPEN' || d.status === 'UNDER_REVIEW' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolve.isPending}
                      onClick={() =>
                        resolve.mutate({
                          id: d.id,
                          status: 'UNDER_REVIEW',
                          resolution: 'Under admin review',
                        })
                      }
                    >
                      Mark reviewing
                    </Button>
                    <Button
                      size="sm"
                      disabled={resolve.isPending}
                      onClick={() =>
                        resolve.mutate({
                          id: d.id,
                          status: 'RESOLVED',
                          outcome: 'REFUND_BUYER',
                          resolution: 'Refund to buyer',
                        })
                      }
                    >
                      Refund buyer
                    </Button>
                    <Button
                      size="sm"
                      disabled={resolve.isPending}
                      onClick={() =>
                        resolve.mutate({
                          id: d.id,
                          status: 'RESOLVED',
                          outcome: 'RELEASE_SELLER',
                          resolution: 'Release to seller',
                        })
                      }
                    >
                      Release seller
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={resolve.isPending}
                      onClick={() =>
                        resolve.mutate({
                          id: d.id,
                          status: 'REJECTED',
                          outcome: 'REJECT',
                          resolution: 'Invalid dispute',
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">{d.resolution}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

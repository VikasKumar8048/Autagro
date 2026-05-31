'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sellerApi } from '@/lib/seller-api';
import { useAuthStore } from '@/stores/auth.store';

export default function SellerListingsPage() {
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const queryClient = useQueryClient();

  const { data: listings, isLoading } = useQuery({
    queryKey: ['seller-listings'],
    queryFn: () => sellerApi.listings(accessToken),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => sellerApi.publishListing(accessToken, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seller-listings'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My listings</h1>
        <Button asChild>
          <Link href="/seller/listings/new">+ New listing</Link>
        </Button>
      </div>

      {isLoading && <p className="text-slate-500">Loading…</p>}

      <div className="grid gap-4">
        {listings?.map((listing) => (
          <Card key={listing.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>
                  {listing.cropName} — {listing.variety}
                </CardTitle>
                <p className="text-sm text-slate-500">
                  {listing.quantity} {listing.unit} · Grade {listing.grade} · ₹
                  {listing.pricePerUnit}/{listing.unit}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  listing.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : listing.status === 'DRAFT'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {listing.status}
              </span>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                {listing.district}, {listing.state} ·{' '}
                {listing.pendingRequestCount
                  ? `${listing.pendingRequestCount} pending request(s)`
                  : 'No pending requests'}
              </p>
              <div className="flex gap-2">
                {listing.status === 'DRAFT' && (
                  <Button
                    size="sm"
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate(listing.id)}
                  >
                    Publish
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !listings?.length && (
          <p className="text-slate-500">No listings yet. Create your first crop listing.</p>
        )}
      </div>
    </div>
  );
}

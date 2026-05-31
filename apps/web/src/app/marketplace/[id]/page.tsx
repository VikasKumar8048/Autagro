'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { marketplaceApi } from '@/lib/marketplace-api';
import { useAuthStore } from '@/stores/auth.store';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user, isAuthenticated } = useAuthStore();
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => marketplaceApi.getById(id),
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      marketplaceApi.createRequest(accessToken!, {
        listingId: id,
        quantity: Number(quantity),
        message: message || undefined,
      }),
    onSuccess: () => router.push('/dashboard'),
  });

  if (isLoading || !listing) {
    return <main className="p-6">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <Link href="/marketplace" className="text-sm text-emerald-700">
        ← Back to marketplace
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>
            {listing.cropName} — {listing.variety}
          </CardTitle>
          <p className="text-slate-500">
            {listing.location.district}, {listing.location.state} · Grade {listing.grade}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Available: <strong>{listing.quantity}</strong> {listing.unit}
          </p>
          <p className="text-xl font-bold text-emerald-800">
            ₹{listing.pricePerUnit.toLocaleString('en-IN')} / {listing.unit}
          </p>
          <p className="text-sm text-slate-600">
            Seller: {listing.seller.name} · Harvest {listing.harvestDate}
          </p>

          {isAuthenticated() && user?.role === 'BUYER' ? (
            <div className="space-y-3 border-t pt-4">
              <div className="space-y-2">
                <Label>Quantity ({listing.unit})</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Input value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <Button
                disabled={requestMutation.isPending || !quantity}
                onClick={() => requestMutation.mutate()}
              >
                Send purchase request
              </Button>
              {requestMutation.isError && (
                <p className="text-sm text-red-600">{requestMutation.error.message}</p>
              )}
            </div>
          ) : (
            <Button asChild>
              <Link href="/login">Sign in as buyer to request</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

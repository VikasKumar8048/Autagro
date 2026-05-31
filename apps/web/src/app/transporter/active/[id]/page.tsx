'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { transporterApi } from '@/lib/transporter-api';
import { useAuthStore } from '@/stores/auth.store';

export default function ActiveJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const queryClient = useQueryClient();
  const [lat, setLat] = useState('18.52');
  const [lng, setLng] = useState('73.85');

  const { data: job, isLoading } = useQuery({
    queryKey: ['transporter-job', id],
    queryFn: () => transporterApi.getJob(accessToken, id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transporter-job', id] });
    queryClient.invalidateQueries({ queryKey: ['transporter-jobs-active'] });
  };

  const pickupMutation = useMutation({
    mutationFn: () => transporterApi.startPickup(accessToken, id),
    onSuccess: invalidate,
  });
  const transitMutation = useMutation({
    mutationFn: () => transporterApi.startTransit(accessToken, id),
    onSuccess: invalidate,
  });
  const gpsMutation = useMutation({
    mutationFn: () => transporterApi.recordGps(accessToken, id, Number(lat), Number(lng)),
    onSuccess: invalidate,
  });
  const deliverMutation = useMutation({
    mutationFn: () => transporterApi.completeDelivery(accessToken, id),
    onSuccess: invalidate,
  });

  if (isLoading || !job) {
    return <p className="text-slate-500">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/transporter/active" className="text-sm text-emerald-700">
        ← Active deliveries
      </Link>

      <Card>
        <CardHeader className="flex flex-row justify-between">
          <CardTitle>
            {job.listing.cropName} — {job.listing.quantity} {job.listing.unit}
          </CardTitle>
          <OrderStatusBadge status={job.status} />
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Pickup: {job.pickup.label}</p>
          <p>Transport fee: ₹{(job.transportFee ?? 0).toLocaleString('en-IN')}</p>

          {job.shipment?.lastLocation && (
            <p className="rounded-lg bg-slate-50 p-3">
              Last GPS: {job.shipment.lastLocation.lat}, {job.shipment.lastLocation.lng} at{' '}
              {new Date(job.shipment.lastLocation.recordedAt).toLocaleString()}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {job.status === 'ASSIGNED' && (
              <Button disabled={pickupMutation.isPending} onClick={() => pickupMutation.mutate()}>
                Mark picked up
              </Button>
            )}
            {job.status === 'PICKED_UP' && (
              <Button disabled={transitMutation.isPending} onClick={() => transitMutation.mutate()}>
                Start transit
              </Button>
            )}
            {(job.status === 'IN_TRANSIT' || job.status === 'PICKED_UP') && (
              <Button
                variant="outline"
                disabled={deliverMutation.isPending}
                onClick={() => deliverMutation.mutate()}
              >
                Mark delivered
              </Button>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="mb-2 font-medium">Update live location</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Lat</Label>
                <Input value={lat} onChange={(e) => setLat(e.target.value)} />
              </div>
              <div>
                <Label>Lng</Label>
                <Input value={lng} onChange={(e) => setLng(e.target.value)} />
              </div>
            </div>
            <Button
              className="mt-2"
              size="sm"
              disabled={gpsMutation.isPending}
              onClick={() => gpsMutation.mutate()}
            >
              Send GPS ping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

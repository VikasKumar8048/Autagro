'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { paymentsApi } from '@/lib/payments-api';
import { transporterApi } from '@/lib/transporter-api';
import { useAuthStore } from '@/stores/auth.store';

export default function TransporterDashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const queryClient = useQueryClient();
  const [lat, setLat] = useState('18.5204');
  const [lng, setLng] = useState('73.8567');

  const { data } = useQuery({
    queryKey: ['transporter-dashboard'],
    queryFn: () => transporterApi.dashboard(accessToken),
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => paymentsApi.wallet(accessToken),
  });

  const locationMutation = useMutation({
    mutationFn: () => transporterApi.updateLocation(accessToken, Number(lat), Number(lng)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporter-jobs-available'] });
    },
  });

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transporter Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Open jobs (platform)</p>
            <p className="text-2xl font-bold">{stats?.openJobsNearby ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Active deliveries</p>
            <p className="text-2xl font-bold">{stats?.activeDeliveries ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-2xl font-bold">{stats?.completedDeliveries ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Wallet balance</p>
            <p className="text-2xl font-bold text-emerald-900">
              ₹{(wallet?.balance ?? 0).toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your location</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Latitude</Label>
            <Input value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Longitude</Label>
            <Input value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={locationMutation.isPending}
              onClick={() => locationMutation.mutate()}
            >
              Update location
            </Button>
          </div>
          <p className="text-xs text-slate-500 sm:col-span-3">
            Used to match nearby transport jobs. In production, this comes from device GPS.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button asChild>
          <Link href="/transporter/jobs">Browse available jobs</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/transporter/active">Active deliveries</Link>
        </Button>
      </div>
    </div>
  );
}

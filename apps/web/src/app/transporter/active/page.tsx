'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { transporterApi } from '@/lib/transporter-api';
import { useAuthStore } from '@/stores/auth.store';

export default function ActiveDeliveriesPage() {
  const accessToken = useAuthStore((s) => s.accessToken)!;

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['transporter-jobs-active'],
    queryFn: () => transporterApi.activeJobs(accessToken),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Active deliveries</h1>
      {isLoading && <p className="text-slate-500">Loading…</p>}

      <div className="space-y-4">
        {jobs?.map((job) => (
          <Link key={job.id} href={`/transporter/active/${job.id}`}>
            <Card className="hover:shadow-md">
              <CardHeader className="flex flex-row justify-between">
                <CardTitle className="text-lg">
                  {job.listing.cropName} ({job.listing.variety})
                </CardTitle>
                <OrderStatusBadge status={job.status} />
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <p>
                  Fee: ₹{(job.transportFee ?? 0).toLocaleString('en-IN')} · Pickup:{' '}
                  {job.pickup.label}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!isLoading && !jobs?.length && (
          <p className="text-slate-500">
            No active deliveries.{' '}
            <Link href="/transporter/jobs" className="text-emerald-700">
              Find jobs
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

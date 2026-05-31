'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { transporterApi } from '@/lib/transporter-api';
import { useAuthStore } from '@/stores/auth.store';

export default function AvailableJobsPage() {
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['transporter-jobs-available'],
    queryFn: () => transporterApi.availableJobs(accessToken, 150),
  });

  const acceptMutation = useMutation({
    mutationFn: (jobId: string) => transporterApi.acceptJob(accessToken, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporter-jobs-available'] });
      queryClient.invalidateQueries({ queryKey: ['transporter-jobs-active'] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Available transport jobs</h1>
      <p className="text-sm text-slate-600">
        First transporter to accept gets the job. Update your location on the dashboard for
        accurate matching.
      </p>

      {isLoading && <p className="text-slate-500">Loading jobs…</p>}

      <div className="space-y-4">
        {jobs?.map((job) => (
          <Card key={job.id}>
            <CardHeader>
              <CardTitle>
                {job.listing.cropName} — {job.listing.quantity} {job.listing.unit}
              </CardTitle>
              <p className="text-sm text-slate-500">
                {job.pickup.label} → {job.drop.label}
                {job.distanceKm != null && ` · ${job.distanceKm.toFixed(1)} km away`}
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm">
                <p>Crop value: ₹{job.cropAmount.toLocaleString('en-IN')}</p>
                {job.estimatedTransportFee != null && (
                  <p className="font-medium text-emerald-800">
                    Est. transport fee: ₹{job.estimatedTransportFee.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              <Button
                disabled={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate(job.id)}
              >
                Accept job
              </Button>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !jobs?.length && (
          <p className="text-slate-500">No jobs in your area. Try updating your GPS location.</p>
        )}
      </div>
    </div>
  );
}

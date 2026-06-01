'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { disputesApi } from '@/lib/disputes-api';
import { useAuthStore } from '@/stores/auth.store';

const TYPES = ['QUALITY', 'QUANTITY', 'DELIVERY', 'PAYMENT', 'OTHER'] as const;

export function OpenDisputeForm({ orderId, disabled }: { orderId: string; disabled?: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const [type, setType] = useState<(typeof TYPES)[number]>('QUALITY');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      disputesApi.create(accessToken, { orderId, type, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['seller-order', orderId] });
    },
  });

  if (disabled) {
    return (
      <p className="text-sm text-slate-500">
        This order cannot accept new disputes (completed, cancelled, or already disputed).
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <label className="block text-sm font-medium text-slate-700">
        Issue type
        <select
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Description
        <textarea
          required
          minLength={10}
          maxLength={2000}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue in detail…"
        />
      </label>
      {mutation.isError && (
        <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && (
        <p className="text-sm text-emerald-700">Dispute submitted. Escrow is frozen until resolution.</p>
      )}
      <Button type="submit" variant="outline" disabled={mutation.isPending}>
        {mutation.isPending ? 'Submitting…' : 'Open dispute'}
      </Button>
    </form>
  );
}

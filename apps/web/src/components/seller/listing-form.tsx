'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const UNITS = ['KG', 'QUINTAL', 'TON', 'BAG'] as const;

export interface ListingFormValues {
  cropName: string;
  variety: string;
  quantity: string;
  unit: (typeof UNITS)[number];
  grade: string;
  harvestDate: string;
  pricePerUnit: string;
  state: string;
  district: string;
  pincode: string;
}

const defaultValues: ListingFormValues = {
  cropName: '',
  variety: '',
  quantity: '',
  unit: 'QUINTAL',
  grade: 'A',
  harvestDate: '',
  pricePerUnit: '',
  state: '',
  district: '',
  pincode: '',
};

export function ListingForm({
  initial,
  onSubmit,
  submitLabel,
  loading,
}: {
  initial?: Partial<ListingFormValues>;
  onSubmit: (values: ListingFormValues) => void;
  submitLabel: string;
  loading?: boolean;
}) {
  const [form, setForm] = useState<ListingFormValues>({ ...defaultValues, ...initial });

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="space-y-2 sm:col-span-2">
        <Label>Crop name</Label>
        <Input
          value={form.cropName}
          onChange={(e) => setForm({ ...form, cropName: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Variety</Label>
        <Input
          value={form.variety}
          onChange={(e) => setForm({ ...form, variety: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Grade</Label>
        <Input
          value={form.grade}
          onChange={(e) => setForm({ ...form, grade: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Quantity</Label>
        <Input
          type="number"
          step="0.001"
          min="0"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Unit</Label>
        <select
          className="flex h-10 w-full rounded-lg border border-emerald-200 px-3 text-sm"
          value={form.unit}
          onChange={(e) =>
            setForm({ ...form, unit: e.target.value as ListingFormValues['unit'] })
          }
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Price per unit (₹)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={form.pricePerUnit}
          onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Harvest date</Label>
        <Input
          type="date"
          value={form.harvestDate}
          onChange={(e) => setForm({ ...form, harvestDate: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>State</Label>
        <Input
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>District</Label>
        <Input
          value={form.district}
          onChange={(e) => setForm({ ...form, district: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Pincode</Label>
        <Input
          value={form.pincode}
          onChange={(e) => setForm({ ...form, pincode: e.target.value })}
          maxLength={6}
          required
        />
      </div>
      <Button type="submit" className="sm:col-span-2" disabled={loading}>
        {loading ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { marketplaceApi } from '@/lib/marketplace-api';

export default function MarketplacePage() {
  const [cropName, setCropName] = useState('');
  const [state, setState] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace', filters],
    queryFn: () => marketplaceApi.search(filters),
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-lg font-bold text-emerald-800">
            FARMORA
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Marketplace</h1>
          <p className="text-slate-600">Browse crops directly from farmers</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Crop name"
          value={cropName}
          onChange={(e) => setCropName(e.target.value)}
          className="max-w-xs"
        />
        <Input
          placeholder="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="max-w-xs"
        />
        <Button
          onClick={() =>
            setFilters({
              ...(cropName ? { cropName } : {}),
              ...(state ? { state } : {}),
            })
          }
        >
          Search
        </Button>
      </div>

      {isLoading && <p className="text-slate-500">Loading listings…</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((item) => (
          <Link key={item.id} href={`/marketplace/${item.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">
                  {item.cropName} — {item.variety}
                </CardTitle>
                <p className="text-sm text-slate-500">
                  {item.location.district}, {item.location.state}
                </p>
              </CardHeader>
              <CardContent className="text-sm">
                <p>
                  {item.quantity} {item.unit} · Grade {item.grade}
                </p>
                <p className="mt-1 font-semibold text-emerald-800">
                  ₹{item.pricePerUnit.toLocaleString('en-IN')} / {item.unit}
                </p>
                <p className="mt-1 text-slate-500">Seller: {item.seller.name ?? 'Farmer'}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {!isLoading && data?.items.length === 0 && (
        <p className="text-slate-500">No active listings found.</p>
      )}
    </main>
  );
}

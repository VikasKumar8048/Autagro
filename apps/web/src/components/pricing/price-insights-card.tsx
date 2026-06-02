'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pricingApi } from '@/lib/pricing-api';

export function PriceInsightsCard({ cropName }: { cropName: string }) {
  const { data: markets, isLoading: loadingMarkets } = useQuery({
    queryKey: ['price-markets', cropName],
    queryFn: () => pricingApi.markets(cropName),
  });
  const { data: spread } = useQuery({
    queryKey: ['price-spread', cropName],
    queryFn: () => pricingApi.spread(cropName),
  });
  const { data: trend } = useQuery({
    queryKey: ['price-trend', cropName],
    queryFn: () => pricingApi.trend(cropName, 7),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mandi price insights ({cropName})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingMarkets ? (
          <p className="text-sm text-slate-500">Loading market prices…</p>
        ) : !markets?.markets.length ? (
          <p className="text-sm text-slate-500">No pricing snapshots yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {markets.markets.slice(0, 3).map((m) => (
              <li key={m.id} className="rounded-md border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800">
                    {m.marketName}, {m.state}
                  </span>
                  <span className="text-emerald-700">
                    Modal: ₹{m.modalPrice.toLocaleString('en-IN')}/{m.unit}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Min ₹{m.minPrice.toLocaleString('en-IN')} · Max ₹
                  {m.maxPrice.toLocaleString('en-IN')} · {m.recordedOn}
                </p>
              </li>
            ))}
          </ul>
        )}

        {spread?.spread != null && (
          <p className="text-sm text-slate-700">
            Inter-market spread: <strong>₹{spread.spread.toLocaleString('en-IN')}</strong> (
            {spread.lowestModal?.marketName} to {spread.highestModal?.marketName})
          </p>
        )}

        {!!trend?.points.length && (
          <p className="text-xs text-slate-500">
            7-day modal trend: ₹
            {trend.points[0].modalPrice.toLocaleString('en-IN')} → ₹
            {trend.points[trend.points.length - 1].modalPrice.toLocaleString('en-IN')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

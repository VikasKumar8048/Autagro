'use client';

import { Suspense } from 'react';
import { BuyerOrdersContent } from './orders-content';

export default function BuyerOrdersPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <BuyerOrdersContent />
    </Suspense>
  );
}

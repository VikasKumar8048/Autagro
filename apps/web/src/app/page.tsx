import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-b from-emerald-50 to-white px-4 text-center">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          FARMORA
        </p>
        <h1 className="text-4xl font-bold text-emerald-950 sm:text-5xl">
          Remove middlemen from crop trading
        </h1>
        <p className="text-lg text-slate-600">
          Connect farmers, buyers, and transporters with transparent pricing, escrow
          payments, and GPS-tracked delivery.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <Button size="lg" asChild>
          <Link href="/login">Get started</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/login">Sign in with OTP</Link>
        </Button>
      </div>
    </main>
  );
}

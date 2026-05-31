'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

export function AppShell({
  children,
  nav,
}: {
  children: React.ReactNode;
  nav: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold text-emerald-800">
            FARMORA
          </Link>
          <nav className="hidden gap-4 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium',
                  pathname.startsWith(item.href)
                    ? 'text-emerald-700'
                    : 'text-slate-600 hover:text-emerald-700',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user?.profile?.fullName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearAuth();
                router.push('/login');
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}

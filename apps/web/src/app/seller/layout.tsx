import { RequireAuth } from '@/components/auth/require-auth';
import { AppShell } from '@/components/layout/app-shell';

const SELLER_NAV = [
  { href: '/seller', label: 'Dashboard' },
  { href: '/seller/listings', label: 'Listings' },
  { href: '/seller/requests', label: 'Requests' },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={['SELLER']}>
      <AppShell nav={SELLER_NAV}>{children}</AppShell>
    </RequireAuth>
  );
}

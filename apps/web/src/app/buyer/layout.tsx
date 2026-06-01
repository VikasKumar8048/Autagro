import { RequireAuth } from '@/components/auth/require-auth';
import { AppShell } from '@/components/layout/app-shell';

const BUYER_NAV = [
  { href: '/buyer', label: 'Dashboard' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/buyer/requests', label: 'My requests' },
  { href: '/buyer/orders', label: 'Orders' },
  { href: '/wallet', label: 'Wallet' },
];

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={['BUYER']}>
      <AppShell nav={BUYER_NAV}>{children}</AppShell>
    </RequireAuth>
  );
}

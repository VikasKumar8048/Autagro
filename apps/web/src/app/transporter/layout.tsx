import { RequireAuth } from '@/components/auth/require-auth';
import { AppShell } from '@/components/layout/app-shell';

const TRANSPORTER_NAV = [
  { href: '/transporter', label: 'Dashboard' },
  { href: '/transporter/jobs', label: 'Available jobs' },
  { href: '/transporter/active', label: 'Active deliveries' },
  { href: '/wallet', label: 'Wallet' },
];

export default function TransporterLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={['TRANSPORTER']}>
      <AppShell nav={TRANSPORTER_NAV}>{children}</AppShell>
    </RequireAuth>
  );
}

import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}

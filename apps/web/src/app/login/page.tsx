import { OtpLoginForm } from '@/components/auth/otp-login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
      <OtpLoginForm />
    </main>
  );
}

'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth.store';

export function OtpLoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(null);

  const requestMutation = useMutation({
    mutationFn: () => authApi.requestOtp(phone),
    onSuccess: () => {
      setError(null);
      setStep('otp');
    },
    onError: (err: Error) => setError(err.message),
  });

  const verifyMutation = useMutation({
    mutationFn: () => authApi.verifyOtp(phone, code),
    onSuccess: (data) => {
      setError(null);
      if (data.isNewUser || !data.tokens.accessToken) {
        router.push(`/register?phone=${encodeURIComponent(phone)}`);
        return;
      }
      setAuth({
        user: data.user,
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
      });
      router.push('/dashboard');
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
        return;
      }
      setError(err.message);
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in to FARMORA</CardTitle>
        <CardDescription>
          Transparent crop trading — farmer to buyer, no middlemen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'phone' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                autoComplete="tel"
              />
            </div>
            <Button
              className="w-full"
              disabled={requestMutation.isPending}
              onClick={() => requestMutation.mutate()}
            >
              {requestMutation.isPending ? 'Sending…' : 'Send OTP'}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="code">6-digit OTP</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
              />
            </div>
            <Button
              className="w-full"
              disabled={verifyMutation.isPending || code.length !== 6}
              onClick={() => verifyMutation.mutate()}
            >
              {verifyMutation.isPending ? 'Verifying…' : 'Verify & continue'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep('phone')}>
              Change number
            </Button>
          </>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-center text-xs text-slate-500">
          Dev mode: OTP is printed in the API server logs.
        </p>
      </CardContent>
    </Card>
  );
}

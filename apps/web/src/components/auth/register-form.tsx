'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/auth-api';
import { useAuthStore, type UserRole as StoreRole } from '@/stores/auth.store';

const ROLES: { value: StoreRole; label: string }[] = [
  { value: 'SELLER', label: 'Farmer / Seller' },
  { value: 'BUYER', label: 'Buyer' },
  { value: 'TRANSPORTER', label: 'Transporter' },
];

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({
    phone: params.get('phone') ?? '+91',
    role: 'SELLER' as StoreRole,
    fullName: '',
    email: '',
    state: '',
    district: '',
    pincode: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: () =>
      authApi.register({
        phone: form.phone,
        role: form.role,
        fullName: form.fullName,
        email: form.email || undefined,
        state: form.state,
        district: form.district,
        pincode: form.pincode,
        password: form.password || undefined,
      }),
    onSuccess: (data) => {
      setAuth({
        user: data.user,
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
      });
      router.push('/dashboard');
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Complete your profile</CardTitle>
        <CardDescription>Tell us how you will use FARMORA.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Phone</Label>
          <Input value={form.phone} disabled />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>I am a</Label>
          <select
            className="flex h-10 w-full rounded-lg border border-emerald-200 px-3 text-sm"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as StoreRole })}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Full name</Label>
          <Input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>District</Label>
          <Input
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Pincode</Label>
          <Input
            value={form.pincode}
            onChange={(e) => setForm({ ...form, pincode: e.target.value })}
            maxLength={6}
          />
        </div>
        <div className="space-y-2">
          <Label>Email (optional)</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Password (optional)</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 sm:col-span-2">{error}</p>
        )}
        <Button
          className="sm:col-span-2"
          disabled={registerMutation.isPending}
          onClick={() => registerMutation.mutate()}
        >
          {registerMutation.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </CardContent>
    </Card>
  );
}

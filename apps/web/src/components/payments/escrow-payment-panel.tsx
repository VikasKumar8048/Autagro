'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { paymentsApi } from '@/lib/payments-api';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function EscrowPaymentPanel({
  accessToken,
  orderId,
}: {
  accessToken: string;
  orderId: string;
}) {
  const queryClient = useQueryClient();

  const { data: escrow, isLoading } = useQuery({
    queryKey: ['escrow', orderId],
    queryFn: () => paymentsApi.getEscrow(accessToken, orderId),
  });

  const mockPayMutation = useMutation({
    mutationFn: () => paymentsApi.mockPay(accessToken, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrow', orderId] });
      queryClient.invalidateQueries({ queryKey: ['buyer-order', orderId] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () => paymentsApi.checkout(accessToken, orderId),
    onSuccess: async (session) => {
      if (session.provider === 'MOCK') {
        mockPayMutation.mutate();
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        alert('Failed to load Razorpay. Use mock pay in development.');
        return;
      }

      const rzp = new window.Razorpay({
        key: session.publicKey,
        amount: session.amountInPaise,
        currency: session.currency,
        name: 'FARMORA',
        description: 'FARMORA crop escrow payment',
        order_id: session.providerOrderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await paymentsApi.verify(accessToken, orderId, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          queryClient.invalidateQueries({ queryKey: ['escrow', orderId] });
          queryClient.invalidateQueries({ queryKey: ['buyer-order', orderId] });
        },
      });
      rzp.open();
    },
  });

  if (isLoading || !escrow) {
    return null;
  }

  if (escrow.escrow?.status === 'FUNDED' || escrow.escrow?.status === 'RELEASED') {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="pt-6">
          <p className="font-medium text-emerald-800">
            Escrow {escrow.escrow.status === 'RELEASED' ? 'released' : 'funded'} — ₹
            {escrow.escrow.totalAmount.toLocaleString('en-IN')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!escrow.canPay) {
    return null;
  }

  const b = escrow.breakdown;

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="text-lg">AgriPay Escrow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
          <span>Crop (seller)</span>
          <span className="text-right font-medium">₹{b.cropAmount.toLocaleString('en-IN')}</span>
          <span>Transport</span>
          <span className="text-right font-medium">
            ₹{b.transportAmount.toLocaleString('en-IN')}
          </span>
          <span>Platform fee</span>
          <span className="text-right font-medium">
            ₹{b.platformAmount.toLocaleString('en-IN')}
          </span>
          <span className="font-semibold">Total</span>
          <span className="text-right font-bold text-emerald-800">
            ₹{b.totalAmount.toLocaleString('en-IN')}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Funds are held in escrow until you confirm delivery. Seller and transporter are paid
          only after you confirm receipt.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={checkoutMutation.isPending || mockPayMutation.isPending}
            onClick={() => checkoutMutation.mutate()}
          >
            {checkoutMutation.isPending ? 'Preparing…' : 'Pay via AgriPay'}
          </Button>
          {process.env.NODE_ENV !== 'production' && (
            <Button
              variant="outline"
              disabled={mockPayMutation.isPending}
              onClick={() => mockPayMutation.mutate()}
            >
              Mock pay (dev)
            </Button>
          )}
        </div>
        {(checkoutMutation.isError || mockPayMutation.isError) && (
          <p className="text-red-600">
            {(checkoutMutation.error ?? mockPayMutation.error)?.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

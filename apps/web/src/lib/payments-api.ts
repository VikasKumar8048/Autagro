import { apiRequest } from './api-client';

export interface EscrowBreakdown {
  cropAmount: number;
  transportAmount: number;
  platformAmount: number;
  totalAmount: number;
  currency: string;
}

export interface CheckoutSession {
  escrowId: string;
  orderId: string;
  provider: string;
  publicKey: string;
  providerOrderId: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  breakdown: EscrowBreakdown;
}

export interface EscrowStatusResponse {
  orderId: string;
  orderStatus: string;
  breakdown: EscrowBreakdown;
  canPay: boolean;
  escrow: {
    id: string;
    status: string;
    totalAmount: number;
    fundedAt: string | null;
    releasedAt: string | null;
  } | null;
  ledger: { entryType: string; amount: number; direction: string }[];
}

export interface WalletSummary {
  balance: number;
  currency: string;
  transactions: {
    id: string;
    amount: number;
    direction: string;
    type: string;
    orderId: string | null;
    createdAt: string;
  }[];
}

const auth = (token: string) => ({ accessToken: token });

export const paymentsApi = {
  getEscrow: (token: string, orderId: string) =>
    apiRequest<EscrowStatusResponse>(`/payments/orders/${orderId}/escrow`, auth(token)),

  checkout: (token: string, orderId: string) =>
    apiRequest<CheckoutSession>(`/payments/orders/${orderId}/checkout`, {
      method: 'POST',
      ...auth(token),
    }),

  verify: (
    token: string,
    orderId: string,
    body: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) =>
    apiRequest<EscrowStatusResponse>(`/payments/orders/${orderId}/verify`, {
      method: 'POST',
      ...auth(token),
      body: JSON.stringify(body),
    }),

  mockPay: (token: string, orderId: string) =>
    apiRequest<EscrowStatusResponse>(`/payments/orders/${orderId}/mock-pay`, {
      method: 'POST',
      ...auth(token),
    }),

  wallet: (token: string) =>
    apiRequest<WalletSummary>('/wallet/me', auth(token)),
};

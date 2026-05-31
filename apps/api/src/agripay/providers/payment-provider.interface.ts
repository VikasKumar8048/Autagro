export interface CheckoutSessionRequest {
  escrowId: string;
  orderId: string;
  amountInr: number;
  currency: string;
  buyerEmail?: string;
  buyerPhone: string;
  idempotencyKey: string;
}

export interface CheckoutSessionResult {
  provider: string;
  providerOrderId: string;
  amountInPaise: number;
  currency: string;
  publicKey: string;
}

export interface VerifyPaymentRequest {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(session: CheckoutSessionRequest): Promise<CheckoutSessionResult>;
  verifyPayment(request: VerifyPaymentRequest): boolean;
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  CheckoutSessionRequest,
  CheckoutSessionResult,
  PaymentProvider,
  VerifyPaymentRequest,
} from './payment-provider.interface';
import { PaymentProviderName } from '../agripay.constants';

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
}

@Injectable()
export class RazorpayProvider implements PaymentProvider {
  readonly name = PaymentProviderName.RAZORPAY;
  private readonly logger = new Logger(RazorpayProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createCheckout(session: CheckoutSessionRequest): Promise<CheckoutSessionResult> {
    const keyId = this.config.getOrThrow<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.getOrThrow<string>('RAZORPAY_KEY_SECRET');
    const amountInPaise = Math.round(session.amountInr * 100);

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: session.currency,
        receipt: session.idempotencyKey.slice(0, 40),
        notes: {
          escrowId: session.escrowId,
          orderId: session.orderId,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Razorpay order failed: ${body}`);
      throw new Error('Failed to create Razorpay order');
    }

    const data = (await response.json()) as RazorpayOrderResponse;
    return {
      provider: this.name,
      providerOrderId: data.id,
      amountInPaise: data.amount,
      currency: data.currency,
      publicKey: keyId,
    };
  }

  verifyPayment(request: VerifyPaymentRequest): boolean {
    const secret = this.config.getOrThrow<string>('RAZORPAY_KEY_SECRET');
    const expected = createHmac('sha256', secret)
      .update(`${request.providerOrderId}|${request.providerPaymentId}`)
      .digest('hex');
    return expected === request.signature;
  }
}

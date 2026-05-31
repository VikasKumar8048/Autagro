import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CheckoutSessionRequest,
  CheckoutSessionResult,
  PaymentProvider,
  VerifyPaymentRequest,
} from './payment-provider.interface';
import { PaymentProviderName } from '../agripay.constants';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = PaymentProviderName.MOCK;
  private readonly logger = new Logger(MockPaymentProvider.name);

  async createCheckout(session: CheckoutSessionRequest): Promise<CheckoutSessionResult> {
    this.logger.log(
      `[MOCK PAY] order=${session.orderId} amount=₹${session.amountInr} escrow=${session.escrowId}`,
    );
    return {
      provider: this.name,
      providerOrderId: `mock_order_${uuidv4()}`,
      amountInPaise: Math.round(session.amountInr * 100),
      currency: session.currency,
      publicKey: 'mock_public_key',
    };
  }

  verifyPayment(request: VerifyPaymentRequest): boolean {
    return (
      request.signature === 'mock_valid' ||
      request.signature.startsWith('mock_') ||
      process.env.MOCK_PAYMENTS === 'true'
    );
  }
}

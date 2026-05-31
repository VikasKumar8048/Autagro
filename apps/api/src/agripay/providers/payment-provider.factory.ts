import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderName } from '../agripay.constants';
import { MockPaymentProvider } from './mock-payment.provider';
import { PaymentProvider } from './payment-provider.interface';
import { RazorpayProvider } from './razorpay.provider';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly config: ConfigService,
    private readonly mock: MockPaymentProvider,
    private readonly razorpay: RazorpayProvider,
  ) {}

  getProvider(): PaymentProvider {
    const configured = this.config.get<string>('PAYMENT_PROVIDER', 'MOCK');
    if (configured === PaymentProviderName.RAZORPAY) {
      const hasKeys =
        this.config.get('RAZORPAY_KEY_ID') && this.config.get('RAZORPAY_KEY_SECRET');
      if (hasKeys) {
        return this.razorpay;
      }
    }
    return this.mock;
  }
}

import { Module } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { LedgerService } from './ledger.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { RazorpayProvider } from './providers/razorpay.provider';
import { WalletService } from './wallet.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    EscrowService,
    LedgerService,
    WalletService,
    PaymentsService,
    MockPaymentProvider,
    RazorpayProvider,
    PaymentProviderFactory,
  ],
  exports: [EscrowService, WalletService, LedgerService],
})
export class AgripayModule {}

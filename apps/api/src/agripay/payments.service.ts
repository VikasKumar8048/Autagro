import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EscrowStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { decimalToNumber, toDecimal } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { EscrowService } from './escrow.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrow: EscrowService,
    private readonly providerFactory: PaymentProviderFactory,
  ) {}

  async createCheckout(buyerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { escrow: true, buyer: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.escrow.assertBuyerCanPay(order, buyerId);

    if (order.escrow?.status === EscrowStatus.FUNDED) {
      throw new BadRequestException('Order is already paid');
    }

    const { escrow, breakdown } = await this.escrow.ensureEscrowForOrder(orderId);
    const provider = this.providerFactory.getProvider();
    const idempotencyKey = `pay_${orderId}_${uuidv4().slice(0, 8)}`;

    const session = await provider.createCheckout({
      escrowId: escrow.id,
      orderId,
      amountInr: breakdown.totalAmount,
      currency: breakdown.currency,
      buyerPhone: order.buyer.phone,
      buyerEmail: order.buyer.email ?? undefined,
      idempotencyKey,
    });

    await this.prisma.paymentRecord.create({
      data: {
        escrowId: escrow.id,
        provider: provider.name,
        providerOrderId: session.providerOrderId,
        amount: toDecimal(breakdown.totalAmount),
        currency: breakdown.currency,
        status: 'CREATED',
        idempotencyKey,
      },
    });

    return {
      escrowId: escrow.id,
      orderId,
      provider: provider.name,
      publicKey: session.publicKey,
      providerOrderId: session.providerOrderId,
      amount: breakdown.totalAmount,
      amountInPaise: session.amountInPaise,
      currency: breakdown.currency,
      breakdown,
    };
  }

  async verifyAndCapture(buyerId: string, orderId: string, dto: VerifyPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { escrow: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.escrow.assertBuyerCanPay(order, buyerId);

    const payment = await this.prisma.paymentRecord.findFirst({
      where: {
        escrowId: order.escrow?.id,
        providerOrderId: dto.razorpayOrderId,
        status: 'CREATED',
      },
    });
    if (!payment) {
      throw new NotFoundException('Payment session not found');
    }

    const provider = this.providerFactory.getProvider();
    const valid = provider.verifyPayment({
      providerOrderId: dto.razorpayOrderId,
      providerPaymentId: dto.razorpayPaymentId,
      signature: dto.razorpaySignature,
    });

    if (!valid) {
      await this.prisma.paymentRecord.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException('Payment verification failed');
    }

    await this.escrow.fundEscrow(payment.escrowId, {
      provider: provider.name,
      providerOrderId: dto.razorpayOrderId,
      providerPaymentId: dto.razorpayPaymentId,
      idempotencyKey: payment.idempotencyKey,
    });

    return this.escrow.getEscrowDetails(orderId, buyerId);
  }

  /** Dev/mock: instant capture without Razorpay UI */
  async mockPay(buyerId: string, orderId: string) {
    const checkout = await this.createCheckout(buyerId, orderId);
    return this.verifyAndCapture(buyerId, orderId, {
      razorpayOrderId: checkout.providerOrderId,
      razorpayPaymentId: `mock_pay_${uuidv4()}`,
      razorpaySignature: 'mock_valid',
    });
  }
}

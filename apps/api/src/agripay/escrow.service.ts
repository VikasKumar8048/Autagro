import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EscrowStatus, OrderStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { decimalToNumber, toDecimal } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  LedgerDirection,
  LedgerEntryType,
  PAYABLE_ORDER_STATUSES,
  PLATFORM_FEE_PERCENT,
} from './agripay.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { LedgerService } from './ledger.service';
import { WalletService } from './wallet.service';

export interface EscrowBreakdown {
  cropAmount: number;
  transportAmount: number;
  platformAmount: number;
  totalAmount: number;
  currency: string;
}

@Injectable()
export class EscrowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly wallet: WalletService,
    private readonly notifications: NotificationsService,
  ) {}

  calculateBreakdown(order: {
    cropAmount: Prisma.Decimal;
    transportFee: Prisma.Decimal | null;
    platformFee: Prisma.Decimal | null;
  }): EscrowBreakdown {
    const cropAmount = decimalToNumber(order.cropAmount);
    const transportAmount = order.transportFee
      ? decimalToNumber(order.transportFee)
      : 0;
    const platformAmount =
      order.platformFee != null
        ? decimalToNumber(order.platformFee)
        : Math.round(((cropAmount * PLATFORM_FEE_PERCENT) / 100) * 100) / 100;

    return {
      cropAmount,
      transportAmount,
      platformAmount,
      totalAmount: cropAmount + transportAmount + platformAmount,
      currency: 'INR',
    };
  }

  async ensureEscrowForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { escrow: true, transportJob: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const breakdown = this.calculateBreakdown(order);

    if (order.transportFee == null && breakdown.transportAmount === 0) {
      throw new BadRequestException(
        'Transport must be assigned before payment (transport fee required)',
      );
    }

    if (order.escrow) {
      return { escrow: order.escrow, breakdown, order };
    }

    const escrow = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          platformFee: toDecimal(breakdown.platformAmount),
          transportFee: order.transportFee ?? toDecimal(breakdown.transportAmount),
        },
      });

      return tx.escrowAccount.create({
        data: {
          orderId,
          status: EscrowStatus.PENDING,
          totalAmount: toDecimal(breakdown.totalAmount),
          cropAmount: toDecimal(breakdown.cropAmount),
          transportAmount: toDecimal(breakdown.transportAmount),
          platformAmount: toDecimal(breakdown.platformAmount),
          currency: breakdown.currency,
        },
      });
    });

    return { escrow, breakdown, order };
  }

  async fundEscrow(
    escrowId: string,
    paymentMeta: {
      provider: string;
      providerOrderId: string;
      providerPaymentId: string;
      idempotencyKey: string;
    },
  ) {
    const escrow = await this.prisma.escrowAccount.findUnique({
      where: { id: escrowId },
      include: { order: { include: { transportJob: true } } },
    });
    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }
    if (escrow.status === EscrowStatus.FUNDED) {
      return escrow;
    }
    if (escrow.status !== EscrowStatus.PENDING) {
      throw new BadRequestException(`Escrow cannot be funded in status ${escrow.status}`);
    }

    const total = decimalToNumber(escrow.totalAmount);

    const payment = await this.prisma.paymentRecord.findFirst({
      where: { idempotencyKey: paymentMeta.idempotencyKey },
    });

    await this.prisma.$transaction(async (tx) => {
      if (payment) {
        await tx.paymentRecord.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            providerPaymentId: paymentMeta.providerPaymentId,
          },
        });
      }

      await tx.escrowAccount.update({
        where: { id: escrowId },
        data: { status: EscrowStatus.FUNDED, fundedAt: new Date() },
      });

      await tx.order.update({
        where: { id: escrow.orderId },
        data: { status: OrderStatus.PAID_ESCROW },
      });
    });

    await this.ledger.appendEntry(
      escrowId,
      LedgerEntryType.ESCROW_FUNDING,
      total,
      LedgerDirection.CREDIT,
      paymentMeta.providerPaymentId,
      { provider: paymentMeta.provider },
    );

    const funded = await this.prisma.escrowAccount.findUniqueOrThrow({
      where: { id: escrowId },
      include: { order: true },
    });

    void this.notifications.notify({
      userId: funded.order.sellerId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment in escrow',
      body: `Buyer paid ₹${total.toLocaleString('en-IN')} into escrow for order ${funded.orderId.slice(0, 8)}…`,
      data: { orderId: funded.orderId, escrowId },
      sendSms: true,
    });

    return funded;
  }

  async refundEscrow(orderId: string) {
    const escrow = await this.prisma.escrowAccount.findFirst({
      where: { orderId },
      include: { order: { include: { transportJob: true } } },
    });
    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }
    if (
      escrow.status !== EscrowStatus.FUNDED &&
      escrow.status !== EscrowStatus.DISPUTED
    ) {
      throw new BadRequestException(
        `Refund not allowed for escrow status: ${escrow.status}`,
      );
    }

    const order = escrow.order;
    const total = decimalToNumber(escrow.totalAmount);

    await this.prisma.$transaction(async (tx) => {
      await tx.escrowAccount.update({
        where: { id: escrow.id },
        data: { status: EscrowStatus.REFUNDED },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
    });

    await this.ledger.appendEntry(
      escrow.id,
      LedgerEntryType.REFUND_BUYER,
      total,
      LedgerDirection.DEBIT,
      order.buyerId,
      { payee: 'BUYER' },
    );
    await this.wallet.credit(
      order.buyerId,
      total,
      LedgerEntryType.REFUND_BUYER,
      orderId,
      escrow.id,
    );
    await this.ledger.appendEntry(
      escrow.id,
      'ESCROW_REFUND',
      total,
      LedgerDirection.CREDIT,
      orderId,
    );
    await this.ledger.assertBalanced(escrow.id);

    void this.notifications.notify({
      userId: order.buyerId,
      type: 'DISPUTE_RESOLVED',
      title: 'Escrow refunded',
      body: `₹${total.toLocaleString('en-IN')} has been credited to your wallet.`,
      data: { orderId },
    });

    return this.getEscrowDetails(orderId);
  }

  async releaseEscrow(orderId: string, options?: { force?: boolean }) {
    const escrow = await this.prisma.escrowAccount.findUnique({
      where: { orderId },
      include: {
        order: { include: { transportJob: true } },
      },
    });

    if (!escrow) {
      throw new BadRequestException('No escrow for this order');
    }
    if (escrow.status === EscrowStatus.RELEASED) {
      return escrow;
    }
    const canRelease =
      escrow.status === EscrowStatus.FUNDED ||
      (options?.force && escrow.status === EscrowStatus.DISPUTED);
    if (!canRelease) {
      throw new BadRequestException('Escrow must be funded before release');
    }

    const order = escrow.order;
    if (
      !options?.force &&
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.DELIVERED
    ) {
      throw new BadRequestException('Order must be delivered before escrow release');
    }

    const cropAmount = decimalToNumber(escrow.cropAmount);
    const transportAmount = escrow.transportAmount
      ? decimalToNumber(escrow.transportAmount)
      : 0;
    const platformAmount = escrow.platformAmount
      ? decimalToNumber(escrow.platformAmount)
      : 0;
    const total = decimalToNumber(escrow.totalAmount);

    await this.prisma.$transaction(async (tx) => {
      await tx.escrowAccount.update({
        where: { id: escrow.id },
        data: { status: EscrowStatus.RELEASED, releasedAt: new Date() },
      });
    });

    await this.ledger.appendEntry(
      escrow.id,
      LedgerEntryType.SETTLEMENT_SELLER,
      cropAmount,
      LedgerDirection.DEBIT,
      order.sellerId,
      { payee: 'SELLER' },
    );
    await this.wallet.credit(
      order.sellerId,
      cropAmount,
      LedgerEntryType.SETTLEMENT_SELLER,
      orderId,
      escrow.id,
    );

    if (transportAmount > 0 && order.transportJob?.transporterId) {
      await this.ledger.appendEntry(
        escrow.id,
        LedgerEntryType.SETTLEMENT_TRANSPORTER,
        transportAmount,
        LedgerDirection.DEBIT,
        order.transportJob.transporterId,
        { payee: 'TRANSPORTER' },
      );
      await this.wallet.credit(
        order.transportJob.transporterId,
        transportAmount,
        LedgerEntryType.SETTLEMENT_TRANSPORTER,
        orderId,
        escrow.id,
      );
    }

    if (platformAmount > 0) {
      await this.ledger.appendEntry(
        escrow.id,
        LedgerEntryType.SETTLEMENT_PLATFORM,
        platformAmount,
        LedgerDirection.DEBIT,
        'PLATFORM',
        { payee: 'PLATFORM' },
      );
    }

    await this.ledger.appendEntry(
      escrow.id,
      'ESCROW_RELEASE',
      total,
      LedgerDirection.CREDIT,
      orderId,
    );

    await this.ledger.assertBalanced(escrow.id);

    const payloads = [
      {
        userId: order.sellerId,
        type: 'ESCROW_RELEASED' as const,
        title: 'Payment released',
        body: `₹${cropAmount.toLocaleString('en-IN')} from escrow has been credited to your wallet.`,
        data: { orderId },
      },
    ];
    if (order.transportJob?.transporterId && transportAmount > 0) {
      payloads.push({
        userId: order.transportJob.transporterId,
        type: 'ESCROW_RELEASED' as const,
        title: 'Transport fee released',
        body: `₹${transportAmount.toLocaleString('en-IN')} transport fee credited to your wallet.`,
        data: { orderId },
      });
    }
    void this.notifications.notifyMany(payloads);

    return this.getEscrowDetails(orderId);
  }

  async getEscrowDetails(orderId: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { escrow: true, transportJob: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (
      userId &&
      userId !== order.buyerId &&
      userId !== order.sellerId &&
      order.transportJob?.transporterId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const breakdown = this.calculateBreakdown(order);
    const ledger = order.escrow
      ? await this.ledger.getEscrowLedger(order.escrow.id)
      : [];

    return {
      orderId,
      orderStatus: order.status,
      breakdown,
      escrow: order.escrow
        ? {
            id: order.escrow.id,
            status: order.escrow.status,
            totalAmount: decimalToNumber(order.escrow.totalAmount),
            fundedAt: order.escrow.fundedAt?.toISOString() ?? null,
            releasedAt: order.escrow.releasedAt?.toISOString() ?? null,
          }
        : null,
      ledger,
      canPay:
        order.buyerId === userId &&
        PAYABLE_ORDER_STATUSES.includes(
          order.status as (typeof PAYABLE_ORDER_STATUSES)[number],
        ) &&
        order.escrow?.status !== EscrowStatus.FUNDED &&
        order.escrow?.status !== EscrowStatus.RELEASED &&
        (order.transportFee != null || order.status !== OrderStatus.TRANSPORT_PENDING),
    };
  }

  assertBuyerCanPay(order: { buyerId: string; status: OrderStatus }, buyerId: string) {
    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Only the buyer can pay for this order');
    }
    if (
      !PAYABLE_ORDER_STATUSES.includes(
        order.status as (typeof PAYABLE_ORDER_STATUSES)[number],
      )
    ) {
      throw new BadRequestException(
        `Payment not allowed for order status: ${order.status}`,
      );
    }
  }
}

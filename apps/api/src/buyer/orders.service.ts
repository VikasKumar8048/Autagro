import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { decimalToNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async listForBuyer(buyerId: string, status?: OrderStatus) {
    const orders = await this.prisma.order.findMany({
      where: {
        buyerId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        purchaseRequest: {
          include: {
            listing: {
              select: {
                cropName: true,
                variety: true,
                unit: true,
                state: true,
                district: true,
              },
            },
          },
        },
        seller: { include: { profile: true } },
        transportJob: { select: { id: true, status: true } },
      },
    });
    return orders.map((o) => this.serializeOrder(o));
  }

  async listForSeller(sellerId: string, status?: OrderStatus) {
    const orders = await this.prisma.order.findMany({
      where: {
        sellerId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        purchaseRequest: {
          include: {
            listing: { select: { cropName: true, variety: true, unit: true } },
          },
        },
        buyer: { include: { profile: true } },
        transportJob: { select: { id: true, status: true } },
      },
    });
    return orders.map((o) => this.serializeOrder(o));
  }

  async getForBuyer(buyerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId },
      include: this.detailInclude(),
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.serializeOrderDetail(order);
  }

  async confirmByBuyer(buyerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId },
      include: {
        purchaseRequest: { include: { listing: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.SELLER_ACCEPTED) {
      throw new BadRequestException(
        `Order cannot be confirmed in status: ${order.status}`,
      );
    }

    const buyerProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.transportJob.create({
        data: {
          orderId,
          status: 'PENDING',
          pickupLat: order.purchaseRequest.listing.latitude ?? undefined,
          pickupLng: order.purchaseRequest.listing.longitude ?? undefined,
          dropLat: buyerProfile?.latitude ?? undefined,
          dropLng: buyerProfile?.longitude ?? undefined,
        },
      });

      return tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.TRANSPORT_PENDING },
        include: this.detailInclude(),
      });
    });

    return this.serializeOrderDetail(result);
  }

  async confirmDeliveryByBuyer(buyerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Order is not ready for delivery confirmation');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.COMPLETED },
      include: this.detailInclude(),
    });

    return this.serializeOrderDetail(updated);
  }

  private detailInclude() {
    return {
      purchaseRequest: {
        include: {
          listing: true,
        },
      },
      seller: { include: { profile: true } },
      buyer: { include: { profile: true } },
      transportJob: true,
      shipment: true,
    } satisfies Prisma.OrderInclude;
  }

  private serializeOrder(
    order: {
      id: string;
      status: OrderStatus;
      cropAmount: Prisma.Decimal;
      transportFee: Prisma.Decimal | null;
      currency: string;
      createdAt: Date;
      updatedAt: Date;
      purchaseRequest: {
        quantity: Prisma.Decimal;
        listing: {
          cropName: string;
          variety: string;
          unit: string;
          state?: string;
          district?: string;
        };
      };
      seller?: { profile: { fullName: string } | null };
      buyer?: { profile: { fullName: string } | null };
      transportJob?: { id: string; status: string } | null;
    },
  ) {
    return {
      id: order.id,
      status: order.status,
      cropAmount: decimalToNumber(order.cropAmount),
      transportFee: order.transportFee ? decimalToNumber(order.transportFee) : null,
      currency: order.currency,
      quantity: decimalToNumber(order.purchaseRequest.quantity),
      listing: order.purchaseRequest.listing,
      sellerName: order.seller?.profile?.fullName,
      buyerName: order.buyer?.profile?.fullName,
      transportJob: order.transportJob,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private serializeOrderDetail(
    order: {
      id: string;
      status: OrderStatus;
      cropAmount: Prisma.Decimal;
      transportFee: Prisma.Decimal | null;
      platformFee: Prisma.Decimal | null;
      currency: string;
      createdAt: Date;
      updatedAt: Date;
      purchaseRequest: {
        id: string;
        quantity: Prisma.Decimal;
        message: string | null;
        listing: {
          id: string;
          cropName: string;
          variety: string;
          unit: string;
          grade: string;
          state: string;
          district: string;
          pincode: string;
          pricePerUnit: Prisma.Decimal;
        };
      };
      seller: { id: string; phone: string; profile: { fullName: string } | null };
      transportJob: { id: string; status: string } | null;
      shipment: { id: string; status: string } | null;
    },
  ) {
    return {
      ...this.serializeOrder(order as Parameters<typeof this.serializeOrder>[0]),
      platformFee: order.platformFee ? decimalToNumber(order.platformFee) : null,
      purchaseRequestId: order.purchaseRequest.id,
      message: order.purchaseRequest.message,
      listing: {
        ...order.purchaseRequest.listing,
        pricePerUnit: decimalToNumber(order.purchaseRequest.listing.pricePerUnit),
      },
      seller: {
        id: order.seller.id,
        phone: order.seller.phone,
        fullName: order.seller.profile?.fullName ?? 'Seller',
      },
      shipment: order.shipment,
      nextAction:
        order.status === OrderStatus.SELLER_ACCEPTED ? 'CONFIRM_ORDER' : null,
    };
  }
}

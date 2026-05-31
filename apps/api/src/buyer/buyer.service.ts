import { Injectable } from '@nestjs/common';
import { OrderStatus, PurchaseRequestStatus } from '@prisma/client';
import { decimalToNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BuyerService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(buyerId: string) {
    const [
      pendingRequests,
      awaitingConfirmation,
      activeOrders,
      completedOrders,
    ] = await Promise.all([
      this.prisma.purchaseRequest.count({
        where: { buyerId, status: PurchaseRequestStatus.PENDING },
      }),
      this.prisma.order.count({
        where: { buyerId, status: OrderStatus.SELLER_ACCEPTED },
      }),
      this.prisma.order.count({
        where: {
          buyerId,
          status: {
            in: [
              OrderStatus.BUYER_CONFIRMED,
              OrderStatus.TRANSPORT_PENDING,
              OrderStatus.TRANSPORT_ASSIGNED,
              OrderStatus.PAID_ESCROW,
              OrderStatus.IN_TRANSIT,
            ],
          },
        },
      }),
      this.prisma.order.count({
        where: {
          buyerId,
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
        },
      }),
    ]);

    const recentOrders = await this.prisma.order.findMany({
      where: { buyerId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        purchaseRequest: {
          include: { listing: { select: { cropName: true, variety: true } } },
        },
      },
    });

    return {
      stats: {
        pendingRequests,
        awaitingConfirmation,
        activeOrders,
        completedOrders,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        status: o.status,
        cropName: o.purchaseRequest.listing.cropName,
        variety: o.purchaseRequest.listing.variety,
        cropAmount: decimalToNumber(o.cropAmount),
        createdAt: o.createdAt.toISOString(),
      })),
    };
  }
}

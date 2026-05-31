import { Injectable } from '@nestjs/common';
import { ListingStatus, OrderStatus, PurchaseRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decimalToNumber } from '../common/utils/decimal.util';

@Injectable()
export class SellerService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(sellerId: string) {
    const [
      totalListings,
      activeListings,
      soldListings,
      pendingRequests,
      acceptedOrders,
      inTransitOrders,
      revenueAgg,
    ] = await Promise.all([
      this.prisma.cropListing.count({
        where: { sellerId, status: { not: ListingStatus.REMOVED } },
      }),
      this.prisma.cropListing.count({
        where: { sellerId, status: ListingStatus.ACTIVE },
      }),
      this.prisma.cropListing.count({
        where: { sellerId, status: ListingStatus.SOLD },
      }),
      this.prisma.purchaseRequest.count({
        where: {
          listing: { sellerId },
          status: PurchaseRequestStatus.PENDING,
        },
      }),
      this.prisma.order.count({
        where: { sellerId, status: OrderStatus.SELLER_ACCEPTED },
      }),
      this.prisma.order.count({
        where: {
          sellerId,
          status: { in: [OrderStatus.IN_TRANSIT, OrderStatus.PAID_ESCROW] },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          sellerId,
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
        },
        _sum: { cropAmount: true },
      }),
    ]);

    const recentRequests = await this.prisma.purchaseRequest.findMany({
      where: { listing: { sellerId }, status: PurchaseRequestStatus.PENDING },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { cropName: true, variety: true } },
        buyer: { include: { profile: true } },
      },
    });

    return {
      stats: {
        totalListings,
        activeListings,
        soldListings,
        pendingRequests,
        acceptedOrders,
        inTransitOrders,
        totalEarnings: revenueAgg._sum.cropAmount
          ? decimalToNumber(revenueAgg._sum.cropAmount)
          : 0,
      },
      recentRequests: recentRequests.map((r) => ({
        id: r.id,
        cropName: r.listing.cropName,
        variety: r.listing.variety,
        quantity: decimalToNumber(r.quantity),
        buyerName: r.buyer.profile?.fullName ?? 'Buyer',
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}

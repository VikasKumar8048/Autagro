import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListingStatus,
  OrderStatus,
  PurchaseRequestStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { decimalToNumber, toDecimal } from '../common/utils/decimal.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';

@Injectable()
export class PurchaseRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createAsBuyer(buyerId: string, dto: CreatePurchaseRequestDto) {
    const listing = await this.prisma.cropListing.findUnique({
      where: { id: dto.listingId },
    });

    if (!listing || listing.status !== ListingStatus.ACTIVE) {
      throw new NotFoundException('Active listing not found');
    }

    if (listing.sellerId === buyerId) {
      throw new ForbiddenException('Cannot request your own listing');
    }

    const requestedQty = toDecimal(dto.quantity);
    if (requestedQty.greaterThan(listing.quantity)) {
      throw new BadRequestException('Requested quantity exceeds available quantity');
    }

    const existing = await this.prisma.purchaseRequest.findFirst({
      where: {
        listingId: dto.listingId,
        buyerId,
        status: PurchaseRequestStatus.PENDING,
      },
    });
    if (existing) {
      throw new BadRequestException('You already have a pending request for this listing');
    }

    const request = await this.prisma.purchaseRequest.create({
      data: {
        listingId: dto.listingId,
        buyerId,
        quantity: requestedQty,
        message: dto.message,
      },
      include: {
        listing: { select: { cropName: true, variety: true, sellerId: true } },
      },
    });

    void this.notifications.notify({
      userId: listing.sellerId,
      type: 'PURCHASE_REQUEST',
      title: 'New purchase request',
      body: `A buyer requested ${decimalToNumber(requestedQty)} ${listing.unit} of ${listing.cropName} (${listing.variety}).`,
      data: { requestId: request.id, listingId: dto.listingId },
      sendSms: true,
    });

    return this.serialize(request);
  }

  async listForBuyer(buyerId: string, status?: PurchaseRequestStatus) {
    const requests = await this.prisma.purchaseRequest.findMany({
      where: {
        buyerId,
        ...(status ? { status } : {}),
      },
      include: {
        listing: {
          select: {
            id: true,
            cropName: true,
            variety: true,
            unit: true,
            pricePerUnit: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => ({
      ...this.serialize(r),
      listing: {
        id: r.listing.id,
        cropName: r.listing.cropName,
        variety: r.listing.variety,
        unit: r.listing.unit,
        pricePerUnit: decimalToNumber(r.listing.pricePerUnit),
        status: r.listing.status,
      },
      estimatedTotal: decimalToNumber(r.listing.pricePerUnit.mul(r.quantity)),
    }));
  }

  async cancelAsBuyer(buyerId: string, requestId: string) {
    const request = await this.prisma.purchaseRequest.findFirst({
      where: { id: requestId, buyerId },
    });
    if (!request) {
      throw new NotFoundException('Purchase request not found');
    }
    if (request.status !== PurchaseRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }
    const updated = await this.prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { status: PurchaseRequestStatus.CANCELLED },
    });
    return this.serialize(updated);
  }

  async listForSeller(sellerId: string, status?: PurchaseRequestStatus) {
    const requests = await this.prisma.purchaseRequest.findMany({
      where: {
        listing: { sellerId },
        ...(status ? { status } : {}),
      },
      include: {
        listing: {
          select: { id: true, cropName: true, variety: true, unit: true, pricePerUnit: true },
        },
        buyer: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => this.serializeWithRelations(r));
  }

  async accept(sellerId: string, requestId: string) {
    const request = await this.getRequestForSeller(sellerId, requestId);

    if (request.status !== PurchaseRequestStatus.PENDING) {
      throw new BadRequestException('Request is no longer pending');
    }

    const cropAmount = request.listing.pricePerUnit.mul(request.quantity);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.purchaseRequest.update({
        where: { id: requestId },
        data: { status: PurchaseRequestStatus.ACCEPTED },
      });

      const order = await tx.order.create({
        data: {
          purchaseRequestId: requestId,
          buyerId: request.buyerId,
          sellerId,
          status: OrderStatus.SELLER_ACCEPTED,
          cropAmount,
        },
      });

      await tx.purchaseRequest.updateMany({
        where: {
          listingId: request.listingId,
          id: { not: requestId },
          status: PurchaseRequestStatus.PENDING,
        },
        data: { status: PurchaseRequestStatus.REJECTED },
      });

      return { request: updatedRequest, order };
    });

    void this.notifications.notify({
      userId: request.buyerId,
      type: 'REQUEST_ACCEPTED',
      title: 'Request accepted',
      body: `The seller accepted your request for ${request.listing.cropName}. Please confirm the order.`,
      data: { orderId: result.order.id, requestId },
      sendSms: true,
    });

    return {
      request: this.serialize(result.request),
      order: {
        id: result.order.id,
        status: result.order.status,
        cropAmount: decimalToNumber(result.order.cropAmount),
        currency: result.order.currency,
      },
    };
  }

  async reject(sellerId: string, requestId: string) {
    const request = await this.getRequestForSeller(sellerId, requestId);

    if (request.status !== PurchaseRequestStatus.PENDING) {
      throw new BadRequestException('Request is no longer pending');
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { status: PurchaseRequestStatus.REJECTED },
    });

    void this.notifications.notify({
      userId: request.buyerId,
      type: 'REQUEST_REJECTED',
      title: 'Request declined',
      body: `Your request for ${request.listing.cropName} was declined by the seller.`,
      data: { requestId },
    });

    return this.serialize(updated);
  }

  private async getRequestForSeller(sellerId: string, requestId: string) {
    const request = await this.prisma.purchaseRequest.findFirst({
      where: { id: requestId, listing: { sellerId } },
      include: { listing: true },
    });
    if (!request) {
      throw new NotFoundException('Purchase request not found');
    }
    return request;
  }

  private serialize(request: {
    id: string;
    listingId: string;
    buyerId: string;
    quantity: Prisma.Decimal;
    message: string | null;
    status: PurchaseRequestStatus;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: request.id,
      listingId: request.listingId,
      buyerId: request.buyerId,
      quantity: decimalToNumber(request.quantity),
      message: request.message,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  private serializeWithRelations(
    request: {
      id: string;
      listingId: string;
      buyerId: string;
      quantity: Prisma.Decimal;
      message: string | null;
      status: PurchaseRequestStatus;
      createdAt: Date;
      updatedAt: Date;
      listing: {
        id: string;
        cropName: string;
        variety: string;
        unit: string;
        pricePerUnit: Prisma.Decimal;
      };
      buyer: {
        id: string;
        phone: string;
        profile: { fullName: string; district: string; state: string } | null;
      };
    },
  ) {
    const estimatedTotal = decimalToNumber(
      request.listing.pricePerUnit.mul(request.quantity),
    );
    return {
      ...this.serialize(request),
      estimatedTotal,
      listing: {
        id: request.listing.id,
        cropName: request.listing.cropName,
        variety: request.listing.variety,
        unit: request.listing.unit,
        pricePerUnit: decimalToNumber(request.listing.pricePerUnit),
      },
      buyer: {
        id: request.buyer.id,
        phone: request.buyer.phone,
        fullName: request.buyer.profile?.fullName ?? 'Buyer',
      },
    };
  }

  assertBuyerRole(role: UserRole) {
    if (role !== UserRole.BUYER) {
      throw new ForbiddenException('Only buyers can create purchase requests');
    }
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingStatus, Prisma } from '@prisma/client';
import { decimalToNumber, toDecimal } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(sellerId: string, dto: CreateListingDto) {
    const listing = await this.prisma.cropListing.create({
      data: {
        sellerId,
        cropName: dto.cropName,
        variety: dto.variety,
        quantity: toDecimal(dto.quantity),
        unit: dto.unit,
        grade: dto.grade,
        harvestDate: new Date(dto.harvestDate),
        pricePerUnit: toDecimal(dto.pricePerUnit),
        state: dto.state,
        district: dto.district,
        pincode: dto.pincode,
        latitude: dto.latitude != null ? toDecimal(dto.latitude) : undefined,
        longitude: dto.longitude != null ? toDecimal(dto.longitude) : undefined,
        imageUrls: dto.imageUrls ?? [],
        status: ListingStatus.DRAFT,
      },
    });
    return this.serialize(listing);
  }

  async findBySeller(
    sellerId: string,
    filters?: { status?: ListingStatus },
  ) {
    const listings = await this.prisma.cropListing.findMany({
      where: {
        sellerId,
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { requests: { where: { status: 'PENDING' } } } },
      },
    });
    return listings.map((l) => ({
      ...this.serialize(l),
      pendingRequestCount: l._count.requests,
    }));
  }

  async findOneForSeller(sellerId: string, listingId: string) {
    const listing = await this.prisma.cropListing.findFirst({
      where: { id: listingId, sellerId },
      include: {
        requests: {
          where: { status: 'PENDING' },
          include: {
            buyer: { include: { profile: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return {
      ...this.serialize(listing),
      pendingRequests: listing.requests.map((r) => this.serializeRequest(r)),
    };
  }

  async update(sellerId: string, listingId: string, dto: UpdateListingDto) {
    await this.assertOwnership(sellerId, listingId);
    const data: Prisma.CropListingUpdateInput = {};
    if (dto.cropName != null) data.cropName = dto.cropName;
    if (dto.variety != null) data.variety = dto.variety;
    if (dto.quantity != null) data.quantity = toDecimal(dto.quantity);
    if (dto.unit != null) data.unit = dto.unit;
    if (dto.grade != null) data.grade = dto.grade;
    if (dto.harvestDate != null) data.harvestDate = new Date(dto.harvestDate);
    if (dto.pricePerUnit != null) data.pricePerUnit = toDecimal(dto.pricePerUnit);
    if (dto.state != null) data.state = dto.state;
    if (dto.district != null) data.district = dto.district;
    if (dto.pincode != null) data.pincode = dto.pincode;
    if (dto.latitude != null) data.latitude = toDecimal(dto.latitude);
    if (dto.longitude != null) data.longitude = toDecimal(dto.longitude);
    if (dto.imageUrls != null) data.imageUrls = dto.imageUrls;

    const listing = await this.prisma.cropListing.update({
      where: { id: listingId },
      data,
    });
    return this.serialize(listing);
  }

  async publish(sellerId: string, listingId: string) {
    const listing = await this.assertOwnership(sellerId, listingId);
    if (listing.status !== ListingStatus.DRAFT) {
      throw new ForbiddenException('Only draft listings can be published');
    }
    const updated = await this.prisma.cropListing.update({
      where: { id: listingId },
      data: { status: ListingStatus.ACTIVE },
    });
    return this.serialize(updated);
  }

  async remove(sellerId: string, listingId: string) {
    await this.assertOwnership(sellerId, listingId);
    const updated = await this.prisma.cropListing.update({
      where: { id: listingId },
      data: { status: ListingStatus.REMOVED },
    });
    return this.serialize(updated);
  }

  private async assertOwnership(sellerId: string, listingId: string) {
    const listing = await this.prisma.cropListing.findFirst({
      where: { id: listingId, sellerId },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.status === ListingStatus.REMOVED) {
      throw new ForbiddenException('Listing has been removed');
    }
    return listing;
  }

  private serialize(listing: {
    id: string;
    sellerId: string;
    cropName: string;
    variety: string;
    quantity: Prisma.Decimal;
    unit: string;
    grade: string;
    harvestDate: Date;
    pricePerUnit: Prisma.Decimal;
    currency: string;
    status: ListingStatus;
    state: string;
    district: string;
    pincode: string;
    latitude: Prisma.Decimal | null;
    longitude: Prisma.Decimal | null;
    imageUrls: string[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: listing.id,
      sellerId: listing.sellerId,
      cropName: listing.cropName,
      variety: listing.variety,
      quantity: decimalToNumber(listing.quantity),
      unit: listing.unit,
      grade: listing.grade,
      harvestDate: listing.harvestDate.toISOString().slice(0, 10),
      pricePerUnit: decimalToNumber(listing.pricePerUnit),
      currency: listing.currency,
      status: listing.status,
      state: listing.state,
      district: listing.district,
      pincode: listing.pincode,
      latitude: listing.latitude ? decimalToNumber(listing.latitude) : null,
      longitude: listing.longitude ? decimalToNumber(listing.longitude) : null,
      imageUrls: listing.imageUrls,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    };
  }

  private serializeRequest(
    request: {
      id: string;
      listingId: string;
      buyerId: string;
      quantity: Prisma.Decimal;
      message: string | null;
      status: string;
      createdAt: Date;
      buyer: {
        id: string;
        phone: string;
        profile: { fullName: string; district: string; state: string } | null;
      };
    },
  ) {
    return {
      id: request.id,
      listingId: request.listingId,
      buyerId: request.buyerId,
      quantity: decimalToNumber(request.quantity),
      message: request.message,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      buyer: {
        id: request.buyer.id,
        phone: request.buyer.phone,
        fullName: request.buyer.profile?.fullName ?? 'Buyer',
        location: [request.buyer.profile?.district, request.buyer.profile?.state]
          .filter(Boolean)
          .join(', '),
      },
    };
  }
}

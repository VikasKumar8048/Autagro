import { Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, Prisma } from '@prisma/client';
import { decimalToNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';

export interface MarketplaceFilters {
  cropName?: string;
  state?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  grade?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async search(filters: MarketplaceFilters) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.CropListingWhereInput = {
      status: ListingStatus.ACTIVE,
      ...(filters.cropName
        ? { cropName: { contains: filters.cropName, mode: 'insensitive' } }
        : {}),
      ...(filters.state ? { state: { equals: filters.state, mode: 'insensitive' } } : {}),
      ...(filters.district
        ? { district: { equals: filters.district, mode: 'insensitive' } }
        : {}),
      ...(filters.grade ? { grade: { equals: filters.grade, mode: 'insensitive' } } : {}),
      ...(filters.minPrice != null || filters.maxPrice != null
        ? {
            pricePerUnit: {
              ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
              ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.cropListing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { include: { profile: true } },
        },
      }),
      this.prisma.cropListing.count({ where }),
    ]);

    return {
      items: items.map((l) => this.serialize(l)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const listing = await this.prisma.cropListing.findFirst({
      where: { id, status: ListingStatus.ACTIVE },
      include: { seller: { include: { profile: true } } },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return this.serialize(listing);
  }

  private serialize(
    listing: {
      id: string;
      cropName: string;
      variety: string;
      quantity: Prisma.Decimal;
      unit: string;
      grade: string;
      harvestDate: Date;
      pricePerUnit: Prisma.Decimal;
      currency: string;
      state: string;
      district: string;
      pincode: string;
      imageUrls: string[];
      createdAt: Date;
      seller: {
        id: string;
        profile: {
          fullName: string;
          businessName: string | null;
          state: string;
          district: string;
        } | null;
      };
    },
  ) {
    return {
      id: listing.id,
      cropName: listing.cropName,
      variety: listing.variety,
      quantity: decimalToNumber(listing.quantity),
      unit: listing.unit,
      grade: listing.grade,
      harvestDate: listing.harvestDate.toISOString().slice(0, 10),
      pricePerUnit: decimalToNumber(listing.pricePerUnit),
      currency: listing.currency,
      location: {
        state: listing.state,
        district: listing.district,
        pincode: listing.pincode,
      },
      imageUrls: listing.imageUrls,
      seller: {
        id: listing.seller.id,
        name: listing.seller.profile?.businessName ?? listing.seller.profile?.fullName,
        state: listing.seller.profile?.state,
        district: listing.seller.profile?.district,
      },
      createdAt: listing.createdAt.toISOString(),
    };
  }
}

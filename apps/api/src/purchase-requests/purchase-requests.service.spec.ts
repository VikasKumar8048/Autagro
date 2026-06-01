import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ListingStatus, PurchaseRequestStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PurchaseRequestsService', () => {
  let service: PurchaseRequestsService;

  const listing = {
    id: 'listing-1',
    sellerId: 'seller-1',
    status: ListingStatus.ACTIVE,
    quantity: new Prisma.Decimal(100),
    pricePerUnit: new Prisma.Decimal(50),
  };

  const prisma = {
    cropListing: { findUnique: jest.fn() },
    purchaseRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    order: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const notifications = { notify: jest.fn(), notifyMany: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = module.get(PurchaseRequestsService);
  });

  it('rejects quantity above listing stock', async () => {
    prisma.cropListing.findUnique.mockResolvedValue(listing);
    await expect(
      service.createAsBuyer('buyer-1', {
        listingId: 'listing-1',
        quantity: 200,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates purchase request', async () => {
    prisma.cropListing.findUnique.mockResolvedValue(listing);
    prisma.purchaseRequest.findFirst.mockResolvedValue(null);
    prisma.purchaseRequest.create.mockResolvedValue({
      id: 'req-1',
      listingId: 'listing-1',
      buyerId: 'buyer-1',
      quantity: new Prisma.Decimal(10),
      message: null,
      status: PurchaseRequestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      listing: { cropName: 'Wheat', variety: 'A' },
    });

    const result = await service.createAsBuyer('buyer-1', {
      listingId: 'listing-1',
      quantity: 10,
    });

    expect(result.id).toBe('req-1');
    expect(prisma.purchaseRequest.create).toHaveBeenCalled();
  });
});

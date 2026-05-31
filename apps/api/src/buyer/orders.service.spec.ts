import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const prisma = {
    order: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    transportJob: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(OrdersService);
  });

  it('rejects confirm when order not in SELLER_ACCEPTED', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'o1',
      buyerId: 'b1',
      status: OrderStatus.COMPLETED,
      purchaseRequest: { listing: {} },
    });
    await expect(service.confirmByBuyer('b1', 'o1')).rejects.toThrow(BadRequestException);
  });

  it('confirms order and creates transport job', async () => {
    const order = {
      id: 'o1',
      buyerId: 'b1',
      status: OrderStatus.SELLER_ACCEPTED,
      purchaseRequest: {
        listing: { latitude: null, longitude: null },
      },
    };
    prisma.order.findFirst.mockResolvedValue(order);
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => {
      prisma.transportJob.create.mockResolvedValue({ id: 'tj1' });
      prisma.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.TRANSPORT_PENDING,
        cropAmount: new Prisma.Decimal(5000),
        transportFee: null,
        platformFee: null,
        currency: 'INR',
        createdAt: new Date(),
        updatedAt: new Date(),
        purchaseRequest: {
          id: 'pr1',
          quantity: new Prisma.Decimal(10),
          message: null,
          listing: {
            id: 'l1',
            cropName: 'Wheat',
            variety: 'A',
            unit: 'QUINTAL',
            grade: 'A',
            state: 'MH',
            district: 'Pune',
            pincode: '411001',
            pricePerUnit: new Prisma.Decimal(500),
          },
        },
        seller: { id: 's1', phone: '+91', profile: { fullName: 'Seller' } },
        transportJob: { id: 'tj1', status: 'PENDING' },
        shipment: null,
      });
      return fn(prisma);
    });

    const result = await service.confirmByBuyer('b1', 'o1');
    expect(prisma.transportJob.create).toHaveBeenCalled();
    expect(result.status).toBe(OrderStatus.TRANSPORT_PENDING);
  });

  it('throws when order not found', async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(service.getForBuyer('b1', 'missing')).rejects.toThrow(NotFoundException);
  });
});

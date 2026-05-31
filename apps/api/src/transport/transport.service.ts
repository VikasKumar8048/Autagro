import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { decimalToNumber, toDecimal } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { TransportJobStatus } from './transport.constants';
import { TransportMatchingService } from './transport-matching.service';

@Injectable()
export class TransportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: TransportMatchingService,
  ) {}

  async updateTransporterLocation(
    transporterId: string,
    latitude: number,
    longitude: number,
  ) {
    await this.prisma.userProfile.update({
      where: { userId: transporterId },
      data: {
        latitude: toDecimal(latitude),
        longitude: toDecimal(longitude),
      },
    });
    return { latitude, longitude };
  }

  async startPickup(transporterId: string, jobId: string) {
    const job = await this.assertJob(transporterId, jobId);
    if (job.status !== TransportJobStatus.ASSIGNED) {
      throw new BadRequestException('Job must be in ASSIGNED status to start pickup');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transportJob.update({
        where: { id: jobId },
        data: { status: TransportJobStatus.PICKED_UP },
      });
      await tx.shipment.updateMany({
        where: { orderId: job.orderId },
        data: { status: 'PICKED_UP' },
      });
    });

    return this.matching.getJobForTransporter(transporterId, jobId);
  }

  async startTransit(transporterId: string, jobId: string) {
    const job = await this.assertJob(transporterId, jobId);
    if (job.status !== TransportJobStatus.PICKED_UP) {
      throw new BadRequestException('Job must be picked up before transit');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transportJob.update({
        where: { id: jobId },
        data: { status: TransportJobStatus.IN_TRANSIT },
      });
      await tx.order.update({
        where: { id: job.orderId },
        data: { status: OrderStatus.IN_TRANSIT },
      });
      await tx.shipment.updateMany({
        where: { orderId: job.orderId },
        data: { status: 'IN_TRANSIT' },
      });
    });

    return this.matching.getJobForTransporter(transporterId, jobId);
  }

  async recordGps(
    transporterId: string,
    jobId: string,
    latitude: number,
    longitude: number,
  ) {
    const job = await this.assertJob(transporterId, jobId);
    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId: job.orderId },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    await this.prisma.gpsPoint.create({
      data: {
        shipmentId: shipment.id,
        latitude: toDecimal(latitude),
        longitude: toDecimal(longitude),
      },
    });

    await this.updateTransporterLocation(transporterId, latitude, longitude);

    return this.matching.getJobForTransporter(transporterId, jobId);
  }

  async completeDelivery(transporterId: string, jobId: string) {
    const job = await this.assertJob(transporterId, jobId);
    if (
      job.status !== TransportJobStatus.IN_TRANSIT &&
      job.status !== TransportJobStatus.PICKED_UP
    ) {
      throw new BadRequestException('Job cannot be marked delivered from current status');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transportJob.update({
        where: { id: jobId },
        data: { status: TransportJobStatus.DELIVERED },
      });
      await tx.order.update({
        where: { id: job.orderId },
        data: { status: OrderStatus.DELIVERED },
      });
      await tx.shipment.updateMany({
        where: { orderId: job.orderId },
        data: { status: 'DELIVERED' },
      });
    });

    return this.matching.getJobForTransporter(transporterId, jobId);
  }

  async getTrackingForOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        transportJob: true,
        shipment: {
          include: {
            gpsPoints: { orderBy: { recordedAt: 'desc' }, take: 50 },
          },
        },
        purchaseRequest: { include: { listing: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const points = order.shipment?.gpsPoints ?? [];
    return {
      orderId: order.id,
      orderStatus: order.status,
      transportJob: order.transportJob
        ? {
            id: order.transportJob.id,
            status: order.transportJob.status,
          }
        : null,
      shipment: order.shipment
        ? {
            id: order.shipment.id,
            status: order.shipment.status,
            eta: order.shipment.eta?.toISOString() ?? null,
          }
        : null,
      route: points
        .map((p) => ({
          lat: decimalToNumber(p.latitude),
          lng: decimalToNumber(p.longitude),
          recordedAt: p.recordedAt.toISOString(),
        }))
        .reverse(),
      listing: {
        cropName: order.purchaseRequest.listing.cropName,
        variety: order.purchaseRequest.listing.variety,
      },
    };
  }

  async getDashboard(transporterId: string) {
    const [availableCount, activeCount, completedCount, earnings] = await Promise.all([
      this.prisma.transportJob.count({
        where: { status: TransportJobStatus.PENDING, transporterId: null },
      }),
      this.prisma.transportJob.count({
        where: {
          transporterId,
          status: {
            in: [
              TransportJobStatus.ASSIGNED,
              TransportJobStatus.PICKED_UP,
              TransportJobStatus.IN_TRANSIT,
            ],
          },
        },
      }),
      this.prisma.transportJob.count({
        where: { transporterId, status: TransportJobStatus.DELIVERED },
      }),
      this.prisma.order.aggregate({
        where: {
          transportJob: { transporterId },
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
        },
        _sum: { transportFee: true },
      }),
    ]);

    return {
      stats: {
        openJobsNearby: availableCount,
        activeDeliveries: activeCount,
        completedDeliveries: completedCount,
        totalEarnings: earnings._sum.transportFee
          ? decimalToNumber(earnings._sum.transportFee)
          : 0,
      },
    };
  }

  private async assertJob(transporterId: string, jobId: string) {
    const job = await this.prisma.transportJob.findFirst({
      where: { id: jobId, transporterId },
    });
    if (!job) {
      throw new ForbiddenException('Not assigned to this transport job');
    }
    return job;
  }
}

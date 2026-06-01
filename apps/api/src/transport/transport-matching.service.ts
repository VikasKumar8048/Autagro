import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { decimalToNumber, toDecimal } from '../common/utils/decimal.util';
import { distanceKm, estimateTransportFee } from '../common/utils/geo.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  DEFAULT_MATCH_RADIUS_KM,
  TRANSPORT_LOCK_PREFIX,
  TRANSPORT_LOCK_TTL_SECONDS,
  TransportJobStatus,
} from './transport.constants';

export interface AvailableJobView {
  id: string;
  orderId: string;
  status: string;
  distanceKm: number | null;
  estimatedTransportFee: number | null;
  cropAmount: number;
  pickup: { lat: number | null; lng: number | null; label: string };
  drop: { lat: number | null; lng: number | null; label: string };
  listing: { cropName: string; variety: string; quantity: number; unit: string };
  createdAt: string;
}

@Injectable()
export class TransportMatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  async listAvailableJobs(
    transporterId: string,
    radiusKm = DEFAULT_MATCH_RADIUS_KM,
  ): Promise<AvailableJobView[]> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: transporterId },
    });
    if (!profile) {
      throw new NotFoundException('Complete your transporter profile first');
    }

    const jobs = await this.prisma.transportJob.findMany({
      where: { status: TransportJobStatus.PENDING, transporterId: null },
      include: {
        order: {
          include: {
            purchaseRequest: {
              include: {
                listing: true,
                buyer: { include: { profile: true } },
              },
            },
            seller: { include: { profile: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const transporterLat = profile.latitude ? decimalToNumber(profile.latitude) : null;
    const transporterLng = profile.longitude ? decimalToNumber(profile.longitude) : null;

    const results: AvailableJobView[] = [];

    for (const job of jobs) {
      const listing = job.order.purchaseRequest.listing;
      const buyerProfile = job.order.purchaseRequest.buyer.profile;

      const pickupLat = job.pickupLat ? decimalToNumber(job.pickupLat) : null;
      const pickupLng = job.pickupLng ? decimalToNumber(job.pickupLng) : null;
      const dropLatNum = job.dropLat
        ? decimalToNumber(job.dropLat)
        : buyerProfile?.latitude
          ? decimalToNumber(buyerProfile.latitude)
          : null;
      const dropLngNum = job.dropLng
        ? decimalToNumber(job.dropLng)
        : buyerProfile?.longitude
          ? decimalToNumber(buyerProfile.longitude)
          : null;

      let dist: number | null = null;
      if (transporterLat != null && transporterLng != null && pickupLat != null && pickupLng != null) {
        dist = distanceKm(transporterLat, transporterLng, pickupLat, pickupLng);
        if (dist > radiusKm) {
          continue;
        }
      } else if (transporterLat == null) {
        const sameRegion =
          profile.state === listing.state && profile.district === listing.district;
        if (!sameRegion) {
          continue;
        }
      }

      let transportFee: number | null = null;
      if (pickupLat != null && pickupLng != null && dropLatNum != null && dropLngNum != null) {
        transportFee = estimateTransportFee(
          distanceKm(pickupLat, pickupLng, dropLatNum, dropLngNum),
        );
      }

      results.push({
        id: job.id,
        orderId: job.orderId,
        status: job.status,
        distanceKm: dist,
        estimatedTransportFee: transportFee,
        cropAmount: decimalToNumber(job.order.cropAmount),
        pickup: {
          lat: pickupLat,
          lng: pickupLng,
          label: [listing.district, listing.state].join(', '),
        },
        drop: {
          lat: dropLatNum,
          lng: dropLngNum,
          label: [buyerProfile?.district, buyerProfile?.state].filter(Boolean).join(', ') || 'Buyer',
        },
        listing: {
          cropName: listing.cropName,
          variety: listing.variety,
          quantity: decimalToNumber(job.order.purchaseRequest.quantity),
          unit: listing.unit,
        },
        createdAt: job.createdAt.toISOString(),
      });
    }

    return results.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }

  /**
   * First transporter to acquire Redis lock wins assignment (race-safe).
   */
  async acceptJob(transporterId: string, jobId: string) {
    const lockKey = `${TRANSPORT_LOCK_PREFIX}${jobId}`;
    const client = this.redis.getClient();
    const acquired = await client.set(
      lockKey,
      transporterId,
      'EX',
      TRANSPORT_LOCK_TTL_SECONDS,
      'NX',
    );

    if (acquired !== 'OK') {
      throw new ConflictException('Another transporter is accepting this job. Try another.');
    }

    try {
      const job = await this.prisma.transportJob.findUnique({
        where: { id: jobId },
        include: {
          order: {
            include: {
              purchaseRequest: {
                include: {
                  listing: true,
                  buyer: { include: { profile: true } },
                },
              },
            },
          },
        },
      });

      if (!job || job.status !== TransportJobStatus.PENDING || job.transporterId) {
        throw new ConflictException('Job is no longer available');
      }

      const listing = job.order.purchaseRequest.listing;
      const buyerProfile = job.order.purchaseRequest.buyer.profile;
      const pickupLat = job.pickupLat ? decimalToNumber(job.pickupLat) : null;
      const pickupLng = job.pickupLng ? decimalToNumber(job.pickupLng) : null;
      const dropLat = job.dropLat
        ? decimalToNumber(job.dropLat)
        : buyerProfile?.latitude
          ? decimalToNumber(buyerProfile.latitude)
          : null;
      const dropLng = job.dropLng
        ? decimalToNumber(job.dropLng)
        : buyerProfile?.longitude
          ? decimalToNumber(buyerProfile.longitude)
          : null;

      let transportFee = toDecimal(500);
      if (pickupLat != null && pickupLng != null && dropLat != null && dropLng != null) {
        transportFee = toDecimal(estimateTransportFee(distanceKm(pickupLat, pickupLng, dropLat, dropLng)));
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const current = await tx.transportJob.findUnique({ where: { id: jobId } });
        if (
          !current ||
          current.status !== TransportJobStatus.PENDING ||
          current.transporterId
        ) {
          throw new ConflictException('Job already assigned');
        }

        const updatedJob = await tx.transportJob.update({
          where: { id: jobId },
          data: {
            transporterId,
            status: TransportJobStatus.ASSIGNED,
            acceptedAt: new Date(),
            dropLat: dropLat != null ? toDecimal(dropLat) : undefined,
            dropLng: dropLng != null ? toDecimal(dropLng) : undefined,
          },
        });

        await tx.order.update({
          where: { id: job.orderId },
          data: {
            status: OrderStatus.TRANSPORT_ASSIGNED,
            transportFee,
          },
        });

        await tx.shipment.create({
          data: {
            orderId: job.orderId,
            status: 'ASSIGNED',
          },
        });

        return updatedJob;
      });

      const order = await this.prisma.order.findUniqueOrThrow({
        where: { id: job.orderId },
      });
      void this.notifications.notifyMany([
        {
          userId: order.buyerId,
          type: 'TRANSPORT_ASSIGNED',
          title: 'Transporter assigned',
          body: 'A transporter accepted your delivery. You can pay into escrow when ready.',
          data: { orderId: job.orderId },
          sendSms: true,
        },
        {
          userId: order.sellerId,
          type: 'TRANSPORT_ASSIGNED',
          title: 'Transporter assigned',
          body: 'A transporter will pick up your crop soon.',
          data: { orderId: job.orderId },
        },
      ]);

      return this.getJobForTransporter(transporterId, result.id);
    } finally {
      await client.del(lockKey);
    }
  }

  async getJobForTransporter(transporterId: string, jobId: string) {
    const job = await this.prisma.transportJob.findFirst({
      where: { id: jobId, transporterId },
      include: {
        order: {
          include: {
            purchaseRequest: { include: { listing: true } },
            shipment: { include: { gpsPoints: { orderBy: { recordedAt: 'desc' }, take: 1 } } },
          },
        },
      },
    });
    if (!job) {
      throw new NotFoundException('Transport job not found');
    }
    return this.serializeJob(job);
  }

  async listActiveJobs(transporterId: string) {
    const jobs = await this.prisma.transportJob.findMany({
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
      include: {
        order: {
          include: {
            purchaseRequest: { include: { listing: true } },
            shipment: { include: { gpsPoints: { orderBy: { recordedAt: 'desc' }, take: 1 } } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return jobs.map((j) => this.serializeJob(j));
  }

  private serializeJob(
    job: {
      id: string;
      orderId: string;
      status: string;
      pickupLat: Prisma.Decimal | null;
      pickupLng: Prisma.Decimal | null;
      dropLat: Prisma.Decimal | null;
      dropLng: Prisma.Decimal | null;
      acceptedAt: Date | null;
      createdAt: Date;
      order: {
        cropAmount: Prisma.Decimal;
        transportFee: Prisma.Decimal | null;
        purchaseRequest: {
          quantity: Prisma.Decimal;
          listing: { cropName: string; variety: string; unit: string; district: string; state: string };
        };
        shipment: {
          id: string;
          status: string;
          gpsPoints: { latitude: Prisma.Decimal; longitude: Prisma.Decimal; recordedAt: Date }[];
        } | null;
      };
    },
  ) {
    const listing = job.order.purchaseRequest.listing;
  const lastGps = job.order.shipment?.gpsPoints[0];
    return {
      id: job.id,
      orderId: job.orderId,
      status: job.status,
      cropAmount: decimalToNumber(job.order.cropAmount),
      transportFee: job.order.transportFee ? decimalToNumber(job.order.transportFee) : null,
      pickup: {
        lat: job.pickupLat ? decimalToNumber(job.pickupLat) : null,
        lng: job.pickupLng ? decimalToNumber(job.pickupLng) : null,
        label: [listing.district, listing.state].join(', '),
      },
      drop: {
        lat: job.dropLat ? decimalToNumber(job.dropLat) : null,
        lng: job.dropLng ? decimalToNumber(job.dropLng) : null,
      },
      listing: {
        cropName: listing.cropName,
        variety: listing.variety,
        quantity: decimalToNumber(job.order.purchaseRequest.quantity),
        unit: listing.unit,
      },
      shipment: job.order.shipment
        ? {
            id: job.order.shipment.id,
            status: job.order.shipment.status,
            lastLocation: lastGps
              ? {
                  lat: decimalToNumber(lastGps.latitude),
                  lng: decimalToNumber(lastGps.longitude),
                  recordedAt: lastGps.recordedAt.toISOString(),
                }
              : null,
          }
        : null,
      acceptedAt: job.acceptedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
    };
  }
}

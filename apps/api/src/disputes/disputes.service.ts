import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DisputeStatus,
  EscrowStatus,
  OrderStatus,
  UserRole,
} from '@prisma/client';
import { EscrowService } from '../agripay/escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

const DISPUTABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PAID_ESCROW,
  OrderStatus.IN_TRANSIT,
  OrderStatus.DELIVERED,
  OrderStatus.TRANSPORT_ASSIGNED,
];

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrow: EscrowService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(raisedById: string, dto: CreateDisputeDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { escrow: true, disputes: { where: { status: DisputeStatus.OPEN } } },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.buyerId !== raisedById && order.sellerId !== raisedById) {
      throw new ForbiddenException('Only buyer or seller on this order can raise a dispute');
    }
    if (!DISPUTABLE_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Disputes cannot be opened for order status: ${order.status}`,
      );
    }
    if (order.status === OrderStatus.DISPUTED) {
      throw new BadRequestException('Order already has an active dispute');
    }
    if (order.disputes.length > 0) {
      throw new BadRequestException('An open dispute already exists for this order');
    }
    if (
      order.escrow &&
      order.escrow.status !== EscrowStatus.FUNDED &&
      order.escrow.status !== EscrowStatus.DISPUTED
    ) {
      throw new BadRequestException('Escrow must be funded before opening a dispute');
    }

    const snapshotOrderStatus = order.status;

    const dispute = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dispute.create({
        data: {
          orderId: dto.orderId,
          raisedById,
          type: dto.type,
          description: dto.description,
          evidenceUrls: dto.evidenceUrls ?? [],
          snapshotOrderStatus,
        },
        include: {
          raisedBy: { include: { profile: true } },
          order: true,
        },
      });
      await tx.order.update({
        where: { id: dto.orderId },
        data: { status: OrderStatus.DISPUTED },
      });
      if (order.escrow) {
        await tx.escrowAccount.update({
          where: { id: order.escrow.id },
          data: { status: EscrowStatus.DISPUTED },
        });
      }
      return created;
    });

    const counterpartyId =
      raisedById === order.buyerId ? order.sellerId : order.buyerId;

    void this.notifications.notifyMany([
      {
        userId: counterpartyId,
        type: 'DISPUTE_OPENED',
        title: 'Dispute opened',
        body: `A ${dto.type.toLowerCase()} dispute was opened on order ${dto.orderId.slice(0, 8)}…`,
        data: { orderId: dto.orderId, disputeId: dispute.id },
        sendSms: true,
      },
      {
        userId: raisedById,
        type: 'DISPUTE_OPENED',
        title: 'Dispute submitted',
        body: 'Your dispute is under review. Escrow funds are frozen until resolution.',
        data: { orderId: dto.orderId, disputeId: dispute.id },
      },
    ]);

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN, status: 'ACTIVE' },
      select: { id: true },
    });
    if (admins.length) {
      void this.notifications.notifyMany(
        admins.map((a) => ({
          userId: a.id,
          type: 'DISPUTE_OPENED' as const,
          title: 'New dispute',
          body: `${dto.type} dispute on order ${dto.orderId.slice(0, 8)}…`,
          data: { orderId: dto.orderId, disputeId: dispute.id },
        })),
      );
    }

    return this.serialize(dispute);
  }

  async listMine(userId: string) {
    const items = await this.prisma.dispute.findMany({
      where: {
        OR: [
          { raisedById: userId },
          { order: { buyerId: userId } },
          { order: { sellerId: userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        raisedBy: { include: { profile: true } },
        order: {
          include: {
            purchaseRequest: {
              include: { listing: { select: { cropName: true, variety: true } } },
            },
          },
        },
      },
    });
    return items.map((d) => this.serialize(d));
  }

  async getForUser(userId: string, disputeId: string) {
    const dispute = await this.prisma.dispute.findFirst({
      where: {
        id: disputeId,
        OR: [
          { raisedById: userId },
          { order: { buyerId: userId } },
          { order: { sellerId: userId } },
        ],
      },
      include: {
        raisedBy: { include: { profile: true } },
        order: {
          include: {
            purchaseRequest: {
              include: { listing: { select: { cropName: true, variety: true } } },
            },
          },
        },
      },
    });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    return this.serialize(dispute);
  }

  async listForAdmin(status?: DisputeStatus) {
    const items = await this.prisma.dispute.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        raisedBy: { include: { profile: true } },
        order: {
          include: {
            buyer: { include: { profile: true } },
            seller: { include: { profile: true } },
            purchaseRequest: {
              include: { listing: { select: { cropName: true, variety: true } } },
            },
          },
        },
      },
    });
    return items.map((d) => this.serialize(d));
  }

  async resolve(disputeId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: { include: { escrow: true } } },
    });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.REJECTED) {
      throw new BadRequestException('Dispute is already closed');
    }

    if (dto.status === DisputeStatus.UNDER_REVIEW) {
      const updated = await this.prisma.dispute.update({
        where: { id: disputeId },
        data: { status: DisputeStatus.UNDER_REVIEW, resolution: dto.resolution },
        include: { raisedBy: { include: { profile: true } }, order: true },
      });
      return this.serialize(updated);
    }

    if (dto.status === DisputeStatus.RESOLVED) {
      if (!dto.outcome || dto.outcome === 'REJECT') {
        throw new BadRequestException('Resolved disputes require outcome REFUND_BUYER or RELEASE_SELLER');
      }
      if (dto.outcome === 'REFUND_BUYER') {
        await this.escrow.refundEscrow(dispute.orderId);
      } else {
        await this.escrow.releaseEscrow(dispute.orderId, { force: true });
        await this.prisma.order.update({
          where: { id: dispute.orderId },
          data: { status: OrderStatus.COMPLETED },
        });
      }
      const updated = await this.prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED,
          resolution: dto.resolution ?? `Outcome: ${dto.outcome}`,
        },
        include: { raisedBy: { include: { profile: true } }, order: true },
      });
      await this.notifyResolved(dispute.order.buyerId, dispute.order.sellerId, dispute.orderId, dto.outcome);
      return this.serialize(updated);
    }

    if (dto.status === DisputeStatus.REJECTED) {
      await this.prisma.$transaction(async (tx) => {
        await tx.dispute.update({
          where: { id: disputeId },
          data: {
            status: DisputeStatus.REJECTED,
            resolution: dto.resolution ?? 'Dispute rejected',
          },
        });
        await tx.order.update({
          where: { id: dispute.orderId },
          data: { status: dispute.snapshotOrderStatus },
        });
        if (dispute.order.escrow?.status === EscrowStatus.DISPUTED) {
          await tx.escrowAccount.update({
            where: { id: dispute.order.escrow.id },
            data: { status: EscrowStatus.FUNDED },
          });
        }
      });
      const updated = await this.prisma.dispute.findUniqueOrThrow({
        where: { id: disputeId },
        include: { raisedBy: { include: { profile: true } }, order: true },
      });
      await this.notifyResolved(
        dispute.order.buyerId,
        dispute.order.sellerId,
        dispute.orderId,
        'REJECT',
      );
      return this.serialize(updated);
    }

    throw new BadRequestException('Invalid status transition');
  }

  private async notifyResolved(
    buyerId: string,
    sellerId: string,
    orderId: string,
    outcome: string,
  ) {
    const body =
      outcome === 'REFUND_BUYER'
        ? 'Dispute resolved: escrow refunded to buyer.'
        : outcome === 'RELEASE_SELLER'
          ? 'Dispute resolved: escrow released to seller.'
          : 'Dispute was rejected; order status restored.';
    void this.notifications.notifyMany([
      { userId: buyerId, type: 'DISPUTE_RESOLVED', title: 'Dispute update', body, data: { orderId } },
      { userId: sellerId, type: 'DISPUTE_RESOLVED', title: 'Dispute update', body, data: { orderId } },
    ]);
  }

  private serialize(
    dispute: {
      id: string;
      orderId: string;
      raisedById: string;
      type: string;
      description: string;
      status: DisputeStatus;
      evidenceUrls: string[];
      resolution: string | null;
      snapshotOrderStatus: OrderStatus;
      createdAt: Date;
      updatedAt: Date;
      raisedBy?: { profile: { fullName: string } | null };
      order?: {
        status: OrderStatus;
        purchaseRequest?: {
          listing?: { cropName: string; variety: string | null };
        };
      };
    },
  ) {
    return {
      id: dispute.id,
      orderId: dispute.orderId,
      raisedById: dispute.raisedById,
      raisedByName: dispute.raisedBy?.profile?.fullName ?? null,
      type: dispute.type,
      description: dispute.description,
      status: dispute.status,
      evidenceUrls: dispute.evidenceUrls,
      resolution: dispute.resolution,
      snapshotOrderStatus: dispute.snapshotOrderStatus,
      orderStatus: dispute.order?.status ?? null,
      cropName: dispute.order?.purchaseRequest?.listing?.cropName ?? null,
      variety: dispute.order?.purchaseRequest?.listing?.variety ?? null,
      createdAt: dispute.createdAt.toISOString(),
      updatedAt: dispute.updatedAt.toISOString(),
    };
  }
}

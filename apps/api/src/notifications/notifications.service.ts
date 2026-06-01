import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationPayload } from './notification.events';
import { NotificationChannelsProvider } from './providers/notification-channels.provider';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channels: NotificationChannelsProvider,
  ) {}

  async notify(payload: NotificationPayload) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type as NotificationType,
        title: payload.title,
        body: payload.body,
        data: (payload.data ?? {}) as Prisma.InputJsonValue,
      },
    });

    let emailSent = false;
    let smsSent = false;

    if (payload.sendEmail !== false) {
      emailSent = await this.channels.sendEmail(
        payload.userId,
        payload.title,
        payload.body,
      );
    }
    if (payload.sendSms) {
      smsSent = await this.channels.sendSms(payload.userId, payload.body);
    }

    if (emailSent || smsSent) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { emailSent, smsSent },
      });
    }

    return notification;
  }

  async notifyMany(payloads: NotificationPayload[]) {
    return Promise.all(payloads.map((p) => this.notify(p)));
  }

  async listForUser(userId: string, unreadOnly = false, limit = 50) {
    const items = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      read: n.readAt != null,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async markRead(userId: string, notificationId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification not found');
    }
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}

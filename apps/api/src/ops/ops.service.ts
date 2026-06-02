import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class OpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  liveness() {
    return { status: 'ok', service: 'api', timestamp: new Date().toISOString() };
  }

  async metrics() {
    const [users, listings, orders, openDisputes, unreadNotifications] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.cropListing.count(),
        this.prisma.order.count(),
        this.prisma.dispute.count({ where: { status: 'OPEN' } }),
        this.prisma.notification.count({ where: { readAt: null } }),
      ]);

    // Lightweight Prometheus text format for quick scraping.
    return [
      '# HELP farmora_users_total Total users',
      '# TYPE farmora_users_total gauge',
      `farmora_users_total ${users}`,
      '# HELP farmora_listings_total Total crop listings',
      '# TYPE farmora_listings_total gauge',
      `farmora_listings_total ${listings}`,
      '# HELP farmora_orders_total Total orders',
      '# TYPE farmora_orders_total gauge',
      `farmora_orders_total ${orders}`,
      '# HELP farmora_disputes_open Open disputes',
      '# TYPE farmora_disputes_open gauge',
      `farmora_disputes_open ${openDisputes}`,
      '# HELP farmora_notifications_unread Unread notifications',
      '# TYPE farmora_notifications_unread gauge',
      `farmora_notifications_unread ${unreadNotifications}`,
    ].join('\n');
  }

  async readiness() {
    const checks = {
      database: false,
      redis: false,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      const pong = await this.redis.getClient().ping();
      checks.redis = pong === 'PONG';
    } catch {
      checks.redis = false;
    }

    const status = checks.database && checks.redis ? 'ready' : 'degraded';
    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}

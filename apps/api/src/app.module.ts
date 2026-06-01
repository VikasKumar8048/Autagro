import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { NotificationsModule } from './notifications/notifications.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AgripayModule } from './agripay/agripay.module';
import { DisputesModule } from './disputes/disputes.module';
import { BuyerModule } from './buyer/buyer.module';
import { TransportModule } from './transport/transport.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { SellerModule } from './seller/seller.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
      {
        name: 'auth',
        ttl: 60_000,
        limit: 20,
      },
    ]),
    PrismaModule,
    RedisModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    SellerModule,
    MarketplaceModule,
    BuyerModule,
    TransportModule,
    AgripayModule,
    DisputesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

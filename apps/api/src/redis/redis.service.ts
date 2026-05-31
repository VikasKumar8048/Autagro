import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    void this.client.connect().catch(() => {
      /* dev fallback: OTP rate limit degrades gracefully */
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async incrementWithExpiry(key: string, windowSeconds: number): Promise<number> {
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }
    return count;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}

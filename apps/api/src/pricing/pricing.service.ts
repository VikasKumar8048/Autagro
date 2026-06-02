import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { decimalToNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface MarketPriceQuery {
  cropName: string;
  state?: string;
  limit?: number;
}

export interface LatestMarketPricesPayload {
  cropName: string;
  state: string | null;
  markets: {
    id: string;
    marketName: string;
    state: string;
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
    unit: string;
    source: string;
    recordedOn: string;
  }[];
}

export interface TrendPayload {
  cropName: string;
  days: number;
  points: {
    date: string;
    modalPrice: number;
    minPrice: number;
    maxPrice: number;
  }[];
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async ingestMockSnapshots() {
    const today = new Date();
    const records = [
      this.record('Wheat', 'Azadpur', 'Delhi', 2200, 2700, 2450, today),
      this.record('Wheat', 'Ludhiana Mandi', 'Punjab', 2100, 2650, 2380, today),
      this.record('Rice', 'Karnal', 'Haryana', 2800, 3400, 3100, today),
      this.record('Maize', 'Indore', 'Madhya Pradesh', 1700, 2300, 1980, today),
      this.record('Onion', 'Lasalgaon', 'Maharashtra', 900, 1900, 1420, today),
    ];

    const tx: Prisma.PrismaPromise<unknown>[] = records.map((r) =>
      this.prisma.cropPriceSnapshot.upsert({
        where: {
          cropName_marketName_recordedOn_source: {
            cropName: r.cropName,
            marketName: r.marketName,
            recordedOn: r.recordedOn,
            source: r.source,
          },
        },
        create: r,
        update: {
          minPrice: r.minPrice,
          maxPrice: r.maxPrice,
          modalPrice: r.modalPrice,
          state: r.state,
          unit: r.unit,
        },
      }),
    );
    await this.prisma.$transaction(tx);
    return { ingested: records.length, recordedOn: today.toISOString().slice(0, 10) };
  }

  async latestMarketPrices(query: MarketPriceQuery) {
    const normalizedCrop = query.cropName.trim().toLowerCase();
    const normalizedState = query.state?.trim().toLowerCase() ?? '';
    const limit = Math.min(query.limit ?? 10, 25);
    const cacheKey = `pricing:latest:${normalizedCrop}:${normalizedState}:${limit}`;

    const cached = await this.safeGetCache<LatestMarketPricesPayload>(cacheKey);
    if (cached) {
      return cached;
    }

    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        cropName: string;
        marketName: string;
        state: string;
        minPrice: Prisma.Decimal;
        maxPrice: Prisma.Decimal;
        modalPrice: Prisma.Decimal;
        unit: string;
        source: string;
        recordedOn: Date;
      }[]
    >`
      SELECT DISTINCT ON (s.market_name)
        s.id,
        s.crop_name as "cropName",
        s.market_name as "marketName",
        s.state,
        s.min_price as "minPrice",
        s.max_price as "maxPrice",
        s.modal_price as "modalPrice",
        s.unit,
        s.source,
        s.recorded_on as "recordedOn"
      FROM crop_price_snapshots s
      WHERE lower(s.crop_name) = ${normalizedCrop}
        AND (${normalizedState} = '' OR lower(s.state) = ${normalizedState})
      ORDER BY s.market_name, s.recorded_on DESC
      LIMIT ${limit}
    `;

    const payload: LatestMarketPricesPayload = {
      cropName: query.cropName,
      state: query.state ?? null,
      markets: rows.map((r) => ({
        id: r.id,
        marketName: r.marketName,
        state: r.state,
        minPrice: decimalToNumber(r.minPrice),
        maxPrice: decimalToNumber(r.maxPrice),
        modalPrice: decimalToNumber(r.modalPrice),
        unit: r.unit,
        source: r.source,
        recordedOn: r.recordedOn.toISOString().slice(0, 10),
      })),
    };
    await this.safeSetCache(cacheKey, payload, 300);
    return payload;
  }

  async trend(cropName: string, days = 7) {
    const normalizedCrop = cropName.trim().toLowerCase();
    const boundedDays = Math.max(3, Math.min(days, 30));
    const cacheKey = `pricing:trend:${normalizedCrop}:${boundedDays}`;
    const cached = await this.safeGetCache<TrendPayload>(cacheKey);
    if (cached) {
      return cached;
    }

    const rows = await this.prisma.$queryRaw<
      { date: Date; avgModal: Prisma.Decimal; avgMin: Prisma.Decimal; avgMax: Prisma.Decimal }[]
    >`
      SELECT
        s.recorded_on as date,
        AVG(s.modal_price) as "avgModal",
        AVG(s.min_price) as "avgMin",
        AVG(s.max_price) as "avgMax"
      FROM crop_price_snapshots s
      WHERE lower(s.crop_name) = ${normalizedCrop}
        AND s.recorded_on >= CURRENT_DATE - ${boundedDays - 1}
      GROUP BY s.recorded_on
      ORDER BY s.recorded_on ASC
    `;

    const payload: TrendPayload = {
      cropName,
      days: boundedDays,
      points: rows.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        modalPrice: Math.round(decimalToNumber(r.avgModal)),
        minPrice: Math.round(decimalToNumber(r.avgMin)),
        maxPrice: Math.round(decimalToNumber(r.avgMax)),
      })),
    };
    await this.safeSetCache(cacheKey, payload, 300);
    return payload;
  }

  async spread(cropName: string, state?: string) {
    const latest = await this.latestMarketPrices({ cropName, state, limit: 50 });
    if (!latest.markets.length) {
      return {
        cropName,
        state: state ?? null,
        marketCount: 0,
        lowestModal: null,
        highestModal: null,
        spread: null,
      };
    }

    const sorted = [...latest.markets].sort((a, b) => a.modalPrice - b.modalPrice);
    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];
    return {
      cropName,
      state: state ?? null,
      marketCount: latest.markets.length,
      lowestModal: { marketName: lowest.marketName, modalPrice: lowest.modalPrice },
      highestModal: { marketName: highest.marketName, modalPrice: highest.modalPrice },
      spread: Math.round((highest.modalPrice - lowest.modalPrice) * 100) / 100,
    };
  }

  private record(
    cropName: string,
    marketName: string,
    state: string,
    minPrice: number,
    maxPrice: number,
    modalPrice: number,
    recordedOn: Date,
  ) {
    return {
      cropName,
      marketName,
      state,
      minPrice: new Prisma.Decimal(minPrice),
      maxPrice: new Prisma.Decimal(maxPrice),
      modalPrice: new Prisma.Decimal(modalPrice),
      unit: 'quintal',
      source: 'MOCK_ENAM',
      recordedOn,
    };
  }

  private async safeGetCache<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.getClient().get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private async safeSetCache(key: string, value: unknown, ttlSeconds: number) {
    try {
      await this.redis.getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // cache is optional in local dev
    }
  }
}

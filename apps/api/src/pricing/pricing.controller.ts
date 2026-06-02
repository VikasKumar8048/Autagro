import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PricingService } from './pricing.service';

class MarketPriceQueryDto {
  @IsString()
  cropName!: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

class TrendQueryDto {
  @IsString()
  cropName!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  days?: number;
}

class SpreadQueryDto {
  @IsString()
  cropName!: string;

  @IsOptional()
  @IsString()
  state?: string;
}

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Public()
  @Get('markets')
  @ApiOperation({ summary: 'Get latest mandi prices for a crop' })
  @ApiQuery({ name: 'cropName' })
  latest(@Query() query: MarketPriceQueryDto) {
    return this.pricing.latestMarketPrices(query);
  }

  @Public()
  @Get('trend')
  @ApiOperation({ summary: 'Get crop modal price trend' })
  trend(@Query() query: TrendQueryDto) {
    return this.pricing.trend(query.cropName, query.days);
  }

  @Public()
  @Get('spread')
  @ApiOperation({ summary: 'Get best/worst market spread for a crop' })
  spread(@Query() query: SpreadQueryDto) {
    return this.pricing.spread(query.cropName, query.state);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Post('ingest/mock')
  @ApiOperation({ summary: 'Admin: ingest mock eNAM snapshots' })
  ingestMock() {
    return this.pricing.ingestMockSnapshots();
  }
}

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { MarketplaceService } from './marketplace.service';

class MarketplaceQueryDto {
  @IsOptional()
  @IsString()
  cropName?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Public()
  @Get('listings')
  @ApiOperation({ summary: 'Browse active crop listings' })
  @ApiQuery({ name: 'cropName', required: false })
  search(@Query() query: MarketplaceQueryDto) {
    return this.marketplace.search(query);
  }

  @Public()
  @Get('listings/:id')
  @ApiOperation({ summary: 'Get listing detail' })
  findOne(@Param('id') id: string) {
    return this.marketplace.findOne(id);
  }
}

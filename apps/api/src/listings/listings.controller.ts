import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ListingStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingsService } from './listings.service';

@ApiTags('seller/listings')
@ApiBearerAuth()
@Roles(UserRole.SELLER)
@Controller('seller/listings')
export class SellerListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  @ApiOperation({ summary: 'List seller crop listings' })
  @ApiQuery({ name: 'status', enum: ListingStatus, required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: ListingStatus,
  ) {
    return this.listings.findBySeller(user.sub, status ? { status } : undefined);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft listing' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateListingDto) {
    return this.listings.create(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get listing with pending requests' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.listings.findOneForSeller(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update listing' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listings.update(user.sub, id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish draft listing to marketplace' })
  publish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.listings.publish(user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove listing (soft delete)' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.listings.remove(user.sub, id);
  }
}

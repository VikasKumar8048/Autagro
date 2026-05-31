import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrderStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { OrdersService } from '../buyer/orders.service';
import { SellerService } from './seller.service';

@ApiTags('seller')
@ApiBearerAuth()
@Roles(UserRole.SELLER)
@Controller('seller')
export class SellerController {
  constructor(
    private readonly seller: SellerService,
    private readonly orders: OrdersService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Seller dashboard stats and recent requests' })
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.seller.getDashboard(user.sub);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List seller orders' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  listOrders(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orders.listForSeller(user.sub, status);
  }
}

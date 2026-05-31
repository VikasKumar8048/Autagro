import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrderStatus, PurchaseRequestStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PurchaseRequestsService } from '../purchase-requests/purchase-requests.service';
import { BuyerService } from './buyer.service';
import { OrdersService } from './orders.service';

@ApiTags('buyer')
@ApiBearerAuth()
@Roles(UserRole.BUYER)
@Controller('buyer')
export class BuyerController {
  constructor(
    private readonly buyer: BuyerService,
    private readonly orders: OrdersService,
    private readonly requests: PurchaseRequestsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Buyer dashboard stats' })
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.buyer.getDashboard(user.sub);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List buyer orders' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  listOrders(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orders.listForBuyer(user.sub, status);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order detail' })
  getOrder(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.getForBuyer(user.sub, id);
  }

  @Post('orders/:id/confirm')
  @ApiOperation({ summary: 'Confirm order after seller acceptance; triggers transport matching' })
  confirmOrder(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.confirmByBuyer(user.sub, id);
  }

  @Post('orders/:id/confirm-delivery')
  @ApiOperation({ summary: 'Confirm crop received; completes order (escrow release in Phase 6)' })
  confirmDelivery(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.confirmDeliveryByBuyer(user.sub, id);
  }

  @Get('requests')
  @ApiOperation({ summary: 'List buyer purchase requests' })
  @ApiQuery({ name: 'status', enum: PurchaseRequestStatus, required: false })
  listRequests(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: PurchaseRequestStatus,
  ) {
    return this.requests.listForBuyer(user.sub, status);
  }

  @Post('requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending purchase request' })
  cancelRequest(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requests.cancelAsBuyer(user.sub, id);
  }
}

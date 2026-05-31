import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PurchaseRequestStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { PurchaseRequestsService } from './purchase-requests.service';

@ApiTags('purchase-requests')
@ApiBearerAuth()
@Controller()
export class PurchaseRequestsController {
  constructor(private readonly requests: PurchaseRequestsService) {}

  @Roles(UserRole.BUYER)
  @Post('purchase-requests')
  @ApiOperation({ summary: 'Buyer: send purchase request for a listing' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePurchaseRequestDto) {
    this.requests.assertBuyerRole(user.role);
    return this.requests.createAsBuyer(user.sub, dto);
  }

  @Roles(UserRole.SELLER)
  @Get('seller/requests')
  @ApiOperation({ summary: 'Seller: list incoming purchase requests' })
  @ApiQuery({ name: 'status', enum: PurchaseRequestStatus, required: false })
  listForSeller(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: PurchaseRequestStatus,
  ) {
    return this.requests.listForSeller(user.sub, status);
  }

  @Roles(UserRole.SELLER)
  @Post('seller/requests/:id/accept')
  @ApiOperation({ summary: 'Seller: accept purchase request and create order' })
  accept(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requests.accept(user.sub, id);
  }

  @Roles(UserRole.SELLER)
  @Post('seller/requests/:id/reject')
  @ApiOperation({ summary: 'Seller: reject purchase request' })
  reject(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requests.reject(user.sub, id);
  }
}

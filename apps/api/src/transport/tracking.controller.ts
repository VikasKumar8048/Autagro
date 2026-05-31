import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TransportService } from './transport.service';

@ApiTags('tracking')
@ApiBearerAuth()
@Roles(UserRole.BUYER, UserRole.SELLER, UserRole.TRANSPORTER)
@Controller('orders')
export class TrackingController {
  constructor(private readonly transport: TransportService) {}

  @Get(':orderId/tracking')
  @ApiOperation({ summary: 'GPS route and shipment status for an order' })
  track(@CurrentUser() user: JwtPayload, @Param('orderId') orderId: string) {
    return this.transport.getTrackingForOrder(user.sub, orderId);
  }
}

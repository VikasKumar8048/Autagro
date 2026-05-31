import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { SellerService } from './seller.service';

@ApiTags('seller')
@ApiBearerAuth()
@Roles(UserRole.SELLER)
@Controller('seller')
export class SellerController {
  constructor(private readonly seller: SellerService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Seller dashboard stats and recent requests' })
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.seller.getDashboard(user.sub);
  }
}

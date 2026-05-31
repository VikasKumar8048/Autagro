import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UpdateLocationDto } from './dto/update-location.dto';
import { TransportMatchingService } from './transport-matching.service';
import { TransportService } from './transport.service';

@ApiTags('transporter')
@ApiBearerAuth()
@Roles(UserRole.TRANSPORTER)
@Controller('transporter')
export class TransporterController {
  constructor(
    private readonly transport: TransportService,
    private readonly matching: TransportMatchingService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Transporter dashboard stats' })
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.transport.getDashboard(user.sub);
  }

  @Post('location')
  @ApiOperation({ summary: 'Update transporter GPS location for job matching' })
  updateLocation(@CurrentUser() user: JwtPayload, @Body() dto: UpdateLocationDto) {
    return this.transport.updateTransporterLocation(user.sub, dto.latitude, dto.longitude);
  }

  @Get('jobs/available')
  @ApiOperation({ summary: 'List nearby open transport jobs' })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  availableJobs(
    @CurrentUser() user: JwtPayload,
    @Query('radiusKm') radiusKm?: string,
  ) {
    const radius = radiusKm ? Number(radiusKm) : undefined;
    return this.matching.listAvailableJobs(user.sub, radius);
  }

  @Post('jobs/:id/accept')
  @ApiOperation({ summary: 'Accept transport job (first wins, Redis lock)' })
  acceptJob(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.matching.acceptJob(user.sub, id);
  }

  @Get('jobs/active')
  @ApiOperation({ summary: 'Current deliveries' })
  activeJobs(@CurrentUser() user: JwtPayload) {
    return this.matching.listActiveJobs(user.sub);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get transport job detail' })
  getJob(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.matching.getJobForTransporter(user.sub, id);
  }

  @Post('jobs/:id/pickup')
  @ApiOperation({ summary: 'Mark crop picked up from farm' })
  startPickup(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.transport.startPickup(user.sub, id);
  }

  @Post('jobs/:id/transit')
  @ApiOperation({ summary: 'Start transit to buyer' })
  startTransit(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.transport.startTransit(user.sub, id);
  }

  @Post('jobs/:id/location')
  @ApiOperation({ summary: 'Record live GPS point during delivery' })
  recordGps(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.transport.recordGps(user.sub, id, dto.latitude, dto.longitude);
  }

  @Post('jobs/:id/deliver')
  @ApiOperation({ summary: 'Mark delivery complete' })
  completeDelivery(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.transport.completeDelivery(user.sub, id);
  }
}

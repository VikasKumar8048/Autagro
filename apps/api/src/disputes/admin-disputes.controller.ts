import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DisputeStatus, UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputesService } from './disputes.service';

@ApiTags('admin-disputes')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/disputes')
export class AdminDisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Get()
  @ApiOperation({ summary: 'List all disputes (admin)' })
  @ApiQuery({ name: 'status', enum: DisputeStatus, required: false })
  list(@Query('status') status?: DisputeStatus) {
    return this.disputes.listForAdmin(status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Review or resolve a dispute' })
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputes.resolve(id, dto);
  }
}

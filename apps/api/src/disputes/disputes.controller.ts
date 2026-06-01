import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { DisputesService } from './disputes.service';

@ApiTags('disputes')
@ApiBearerAuth()
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'Open a dispute on an order (buyer or seller)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDisputeDto) {
    return this.disputes.create(user.sub, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List disputes involving the current user' })
  listMine(@CurrentUser() user: JwtPayload) {
    return this.disputes.listMine(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute detail' })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.disputes.getForUser(user.sub, id);
  }
}

import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { OpsService } from './ops.service';

@ApiTags('ops')
@Controller('ops')
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return this.ops.liveness();
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (database + redis)' })
  ready() {
    return this.ops.readiness();
  }

  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus-style metrics' })
  metrics() {
    return this.ops.metrics();
  }
}

import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TransporterController } from './transporter.controller';
import { TransportMatchingService } from './transport-matching.service';
import { TransportService } from './transport.service';

@Module({
  controllers: [TransporterController, TrackingController],
  providers: [TransportMatchingService, TransportService],
  exports: [TransportMatchingService, TransportService],
})
export class TransportModule {}

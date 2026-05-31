import { Module } from '@nestjs/common';
import { PurchaseRequestsService } from '../purchase-requests/purchase-requests.service';
import { BuyerController } from './buyer.controller';
import { BuyerService } from './buyer.service';
import { OrdersService } from './orders.service';

@Module({
  controllers: [BuyerController],
  providers: [BuyerService, OrdersService, PurchaseRequestsService],
  exports: [OrdersService],
})
export class BuyerModule {}

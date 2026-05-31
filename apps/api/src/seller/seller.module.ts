import { Module } from '@nestjs/common';
import { ListingsService } from '../listings/listings.service';
import { SellerListingsController } from '../listings/listings.controller';
import { PurchaseRequestsController } from '../purchase-requests/purchase-requests.controller';
import { PurchaseRequestsService } from '../purchase-requests/purchase-requests.service';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';

@Module({
  controllers: [
    SellerController,
    SellerListingsController,
    PurchaseRequestsController,
  ],
  providers: [SellerService, ListingsService, PurchaseRequestsService],
})
export class SellerModule {}

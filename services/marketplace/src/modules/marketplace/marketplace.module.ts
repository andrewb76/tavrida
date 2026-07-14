import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioItemEntity } from '../../entities/portfolio-item.entity';
import { ServiceListingEntity } from '../../entities/service-listing.entity';
import { ServiceOrderEntity } from '../../entities/service-order.entity';
import { MarketplaceEventsPublisher } from '../events/marketplace-events.publisher';
import { ListingsService } from '../listings/listings.service';
import { OrdersService } from '../orders/orders.service';
import { InternalMarketplaceController } from './internal-marketplace.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceListingEntity,
      PortfolioItemEntity,
      ServiceOrderEntity,
    ]),
  ],
  controllers: [InternalMarketplaceController],
  providers: [ListingsService, OrdersService, MarketplaceEventsPublisher],
  exports: [ListingsService, OrdersService],
})
export class MarketplaceDomainModule {}

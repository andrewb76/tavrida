import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionEntity } from '../../entities/auction.entity';
import { BidEntity } from '../../entities/bid.entity';
import { ExpertAppraisalEntity } from '../../entities/expert-appraisal.entity';
import { AuctionEventsPublisher } from '../events/auction-events.publisher';
import { InternalAuctionsController } from './internal-auctions.controller';
import { AuctionsService } from './auctions.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuctionEntity, BidEntity, ExpertAppraisalEntity])],
  controllers: [InternalAuctionsController],
  providers: [AuctionsService, AuctionEventsPublisher],
  exports: [AuctionsService],
})
export class AuctionsModule {}

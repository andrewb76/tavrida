import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionEntity } from '../../entities/auction.entity';
import { InternalAuctionsController } from './internal-auctions.controller';
import { AuctionsService } from './auctions.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuctionEntity])],
  controllers: [InternalAuctionsController],
  providers: [AuctionsService],
  exports: [AuctionsService],
})
export class AuctionsModule {}

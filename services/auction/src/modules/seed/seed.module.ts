import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionEntity } from '../../entities/auction.entity';
import { BidEntity } from '../../entities/bid.entity';
import { ExpertAppraisalEntity } from '../../entities/expert-appraisal.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuctionEntity, BidEntity, ExpertAppraisalEntity])],
  providers: [SeedService],
})
export class SeedModule {}

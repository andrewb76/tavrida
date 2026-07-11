import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionEntity } from '../../entities/auction.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuctionEntity])],
  providers: [SeedService],
})
export class SeedModule {}

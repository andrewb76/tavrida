import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioItemEntity } from '../../entities/portfolio-item.entity';
import { ServiceListingEntity } from '../../entities/service-listing.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceListingEntity, PortfolioItemEntity])],
  providers: [SeedService],
})
export class SeedModule {}

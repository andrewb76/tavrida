import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRatingEntity } from '../../entities/user-rating.entity';
import { InternalRatingsController } from './internal-ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserRatingEntity])],
  controllers: [InternalRatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}

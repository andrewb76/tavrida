import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeriodCategoryEntity } from '../../entities/period-category.entity';
import { PeriodEntity } from '../../entities/period.entity';
import { CategoriesService } from '../categories/categories.service';
import { InternalPeriodsController } from './internal-periods.controller';
import { PeriodsService } from './periods.service';

@Module({
  imports: [TypeOrmModule.forFeature([PeriodEntity, PeriodCategoryEntity])],
  controllers: [InternalPeriodsController],
  providers: [CategoriesService, PeriodsService],
  exports: [CategoriesService, PeriodsService],
})
export class PeriodsModule {}

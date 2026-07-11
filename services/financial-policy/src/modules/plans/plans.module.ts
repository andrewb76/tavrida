import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanEntity } from '../../entities/plan.entity';
import { InternalPlansController } from './internal-plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlanEntity])],
  controllers: [InternalPlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}

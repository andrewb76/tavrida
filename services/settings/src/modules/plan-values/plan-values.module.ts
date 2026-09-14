import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanEntity } from '../../entities/plan.entity';
import { PlanValueEntity } from '../../entities/plan-value.entity';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { PlanValuesController } from './plan-values.controller';
import { PlanService } from './plan.service';
import { PlanValueService } from './plan-value.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanEntity,
      PlanValueEntity,
      ParameterEntity,
      UserSubscriptionEntity,
    ]),
  ],
  controllers: [PlanValuesController],
  providers: [PlanService, PlanValueService],
  exports: [PlanService, PlanValueService],
})
export class PlanValuesModule {}

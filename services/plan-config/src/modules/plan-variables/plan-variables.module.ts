import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanVariableEntity } from '../../entities/plan-variable.entity';
import { PlanVariableTierEntity } from '../../entities/plan-variable-tier.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { InternalPlanVariablesController } from './internal-plan-variables.controller';
import { PlanVariablesService } from './plan-variables.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlanVariableEntity, PlanVariableTierEntity]),
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [InternalPlanVariablesController],
  providers: [PlanVariablesService],
  exports: [PlanVariablesService],
})
export class PlanVariablesModule {}

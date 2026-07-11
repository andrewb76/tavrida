import { Module } from '@nestjs/common';
import { PlanVariablesModule } from '../plan-variables/plan-variables.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { InternalLimitsController } from './internal-limits.controller';
import { LimitsService } from './limits.service';

@Module({
  imports: [SubscriptionsModule, PlanVariablesModule],
  controllers: [InternalLimitsController],
  providers: [LimitsService],
  exports: [LimitsService],
})
export class LimitsModule {}

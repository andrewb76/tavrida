import { Module } from '@nestjs/common';
import { ParametersModule } from '../parameters/parameters.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { InternalLimitsController } from './internal-limits.controller';
import { LimitsService } from './limits.service';

@Module({
  imports: [SubscriptionsModule, ParametersModule],
  controllers: [InternalLimitsController],
  providers: [LimitsService],
  exports: [LimitsService],
})
export class LimitsModule {}

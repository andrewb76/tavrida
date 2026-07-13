import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { SubscriptionsClient } from './subscriptions.client';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [AuthModule, PlanConfigModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsClient],
})
export class SubscriptionsModule {}

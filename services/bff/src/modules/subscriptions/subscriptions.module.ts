import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { SubscriptionFanoutService } from './subscription-fanout.service';
import { SubscriptionsClient } from './subscriptions.client';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [AuthModule, PlanConfigModule, NotificationsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsClient, SubscriptionFanoutService],
  exports: [SubscriptionsClient, SubscriptionFanoutService],
})
export class SubscriptionsModule {}

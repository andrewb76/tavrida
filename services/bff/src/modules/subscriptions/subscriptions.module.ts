import { Module } from '@nestjs/common';
import { AuctionClient } from '../auction/auction.client';
import { AuthModule } from '../auth/auth.module';
import { ForumClient } from '../forum/forum.client';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { SubscriptionFanoutService } from './subscription-fanout.service';
import { SubscriptionTitlesService } from './subscription-titles.service';
import { SubscriptionsClient } from './subscriptions.client';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [AuthModule, PlanConfigModule, NotificationsModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsClient,
    SubscriptionFanoutService,
    SubscriptionTitlesService,
    ForumClient,
    AuctionClient,
  ],
  exports: [SubscriptionsClient, SubscriptionFanoutService],
})
export class SubscriptionsModule {}

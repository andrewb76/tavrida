import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPreferenceEntity } from '../../entities/delivery-preference.entity';
import { SubscriptionEntity } from '../../entities/subscription.entity';
import { InternalServiceTokenGuard } from '../auth/internal-service-token.guard';
import { TagEventsConsumer } from '../events/tag-events.consumer';
import { NotificationsClient } from '../notifications/notifications.client';
import { InternalSubscriptionsController } from './internal-subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionEntity, DeliveryPreferenceEntity])],
  controllers: [InternalSubscriptionsController],
  providers: [
    SubscriptionsService,
    InternalServiceTokenGuard,
    NotificationsClient,
    TagEventsConsumer,
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPreferenceEntity } from '../../entities/delivery-preference.entity';
import { SubscriptionEntity } from '../../entities/subscription.entity';
import { InternalSubscriptionsController } from './internal-subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionEntity, DeliveryPreferenceEntity])],
  controllers: [InternalSubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

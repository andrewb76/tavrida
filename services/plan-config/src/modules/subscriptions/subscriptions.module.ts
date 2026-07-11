import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { BillingModule } from '../billing/billing.module';
import { PlansModule } from '../plans/plans.module';
import { InternalSubscriptionsController } from './internal-subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserSubscriptionEntity]), PlansModule, BillingModule],
  controllers: [InternalSubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

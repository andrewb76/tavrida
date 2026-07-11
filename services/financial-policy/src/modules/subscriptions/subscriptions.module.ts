import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { PlansModule } from '../plans/plans.module';
import { InternalSubscriptionsController } from './internal-subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserSubscriptionEntity]), PlansModule],
  controllers: [InternalSubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

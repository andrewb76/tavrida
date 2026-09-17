import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanEntity } from '../../entities/plan.entity';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { BillingModule } from '../billing/billing.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionRenewService } from './subscription-renew.service';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSubscriptionEntity, PlanEntity]),
    ScheduleModule.forRoot(),
    BillingModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionRenewService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}

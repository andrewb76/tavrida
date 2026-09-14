import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LimitPurchaseEntity } from '../../entities/limit-purchase.entity';
import { LimitUsageLogEntity } from '../../entities/limit-usage-log.entity';
import { ParameterEntity } from '../../entities/parameter.entity';
import { UserLimitEntity } from '../../entities/user-limit.entity';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { LimitsController } from './limits.controller';
import { LimitsRestoreService } from './limits-restore.service';
import { LimitsService } from './limits.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserLimitEntity,
      LimitUsageLogEntity,
      LimitPurchaseEntity,
      ParameterEntity,
      UserSubscriptionEntity,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [LimitsController],
  providers: [LimitsService, LimitsRestoreService],
  exports: [LimitsService],
})
export class LimitsModule {}

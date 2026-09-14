import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanValueEntity } from '../../entities/plan-value.entity';
import { SystemValueEntity } from '../../entities/system-value.entity';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { UserValueEntity } from '../../entities/user-value.entity';
import { UserValueController } from './user-value.controller';
import { UserValueService } from './user-value.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserValueEntity,
      ParameterEntity,
      SystemValueEntity,
      PlanValueEntity,
      UserSubscriptionEntity,
    ]),
  ],
  controllers: [UserValueController],
  providers: [UserValueService],
  exports: [UserValueService],
})
export class UserValueModule {}

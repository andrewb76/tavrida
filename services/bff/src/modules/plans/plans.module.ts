import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { PlansController } from './plans.controller';

@Module({
  imports: [AuthModule, PlanConfigModule],
  controllers: [PlansController],
})
export class PlansModule {}

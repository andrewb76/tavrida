import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { AdminPlanConfigController } from './admin-plan-config.controller';

@Module({
  imports: [AuthModule, PlanConfigModule],
  controllers: [AdminPlanConfigController],
  providers: [AdminGuard],
})
export class PlanConfigAdminModule {}

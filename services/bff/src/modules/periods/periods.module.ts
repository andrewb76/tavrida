import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { KetoModule } from '../keto/keto.module';
import { AdminPeriodsController } from './admin-periods.controller';
import { PeriodsClient } from './periods.client';
import { PeriodsController } from './periods.controller';

@Module({
  imports: [AuthModule, KetoModule],
  controllers: [PeriodsController, AdminPeriodsController],
  providers: [PeriodsClient, AdminGuard],
  exports: [PeriodsClient],
})
export class PeriodsModule {}

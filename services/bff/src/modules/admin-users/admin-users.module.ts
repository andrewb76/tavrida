import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { ForumClient } from '../forum/forum.client';
import { LogtoModule } from '../logto/logto.module';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [AuthModule, BillingModule, UserProfileModule, PlanConfigModule, LogtoModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminGuard, ForumClient],
})
export class AdminUsersModule {}

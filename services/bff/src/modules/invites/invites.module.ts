import { Module } from '@nestjs/common';
import { ResolveRateLimitGuard } from '../../common/resolve-rate-limit.guard';
import { AuthModule } from '../auth/auth.module';
import { LogtoModule } from '../logto/logto.module';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { ScalarConfigModule } from '../scalar-config/scalar-config.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [AuthModule, LogtoModule, UserProfileModule, ScalarConfigModule, PlanConfigModule],
  controllers: [InvitesController],
  providers: [InvitesService, ResolveRateLimitGuard],
})
export class InvitesModule {}

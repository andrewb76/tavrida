import { Module } from '@nestjs/common';
import { ResolveRateLimitGuard } from '../../common/resolve-rate-limit.guard';
import { AuthModule } from '../auth/auth.module';
import { LogtoModule } from '../logto/logto.module';
import { SettingsModule } from '../settings/settings.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [AuthModule, LogtoModule, UserProfileModule, SettingsModule],
  controllers: [InvitesController],
  providers: [InvitesService, ResolveRateLimitGuard],
})
export class InvitesModule {}

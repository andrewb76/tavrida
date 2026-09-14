import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { AdminSettingsController } from './admin-settings.controller';
import { SettingsClient } from './settings.client';

@Module({
  imports: [AuthModule],
  controllers: [AdminSettingsController],
  providers: [SettingsClient, AdminGuard],
  exports: [SettingsClient],
})
export class SettingsAdminModule {}

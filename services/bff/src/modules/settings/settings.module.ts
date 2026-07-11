import { Module } from '@nestjs/common';
import { SettingsBootstrapService } from './settings-bootstrap.service';
import { ClubSettingsReader } from './club-settings.reader';
import { AdminSettingsController } from './admin-settings.controller';
import { PublicSettingsController } from './public-settings.controller';
import { SettingsClient } from './settings.client';

@Module({
  controllers: [AdminSettingsController, PublicSettingsController],
  providers: [SettingsClient, SettingsBootstrapService, ClubSettingsReader],
  exports: [SettingsClient, ClubSettingsReader],
})
export class SettingsModule {}

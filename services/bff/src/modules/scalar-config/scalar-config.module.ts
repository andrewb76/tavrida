import { Module } from '@nestjs/common';
import { ScalarConfigBootstrapService } from './scalar-config-bootstrap.service';
import { ClubSettingsReader } from './club-settings.reader';
import { AdminScalarConfigController } from './admin-scalar-config.controller';
import { PublicSettingsController } from './public-settings.controller';
import { ScalarConfigClient } from './scalar-config.client';

@Module({
  controllers: [AdminScalarConfigController, PublicSettingsController],
  providers: [ScalarConfigClient, ScalarConfigBootstrapService, ClubSettingsReader],
  exports: [ScalarConfigClient, ClubSettingsReader],
})
export class ScalarConfigModule {}

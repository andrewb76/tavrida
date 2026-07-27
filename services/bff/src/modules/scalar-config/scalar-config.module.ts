import { Module } from '@nestjs/common';
import { ScalarConfigBootstrapService } from './scalar-config-bootstrap.service';
import { AuctionSettingsReader } from './auction-settings.reader';
import { ClubSettingsReader } from './club-settings.reader';
import { ForumSettingsReader } from './forum-settings.reader';
import { AdminScalarConfigController } from './admin-scalar-config.controller';
import { PublicSettingsController } from './public-settings.controller';
import { ScalarConfigClient } from './scalar-config.client';

@Module({
  controllers: [AdminScalarConfigController, PublicSettingsController],
  providers: [
    ScalarConfigClient,
    ScalarConfigBootstrapService,
    ClubSettingsReader,
    ForumSettingsReader,
    AuctionSettingsReader,
  ],
  exports: [ScalarConfigClient, ClubSettingsReader, ForumSettingsReader, AuctionSettingsReader],
})
export class ScalarConfigModule {}

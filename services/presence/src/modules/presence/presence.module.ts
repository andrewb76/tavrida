import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { PresenceController } from './presence.controller';
import { PresenceWorker } from './presence.worker';

@Module({
  controllers: [PresenceController],
  providers: [PresenceService, PresenceWorker],
})
export class PresenceModule {}

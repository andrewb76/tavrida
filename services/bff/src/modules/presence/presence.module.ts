import { Module, Global } from '@nestjs/common';
import { PresenceClient } from './presence.client';

@Global()
@Module({
  providers: [PresenceClient],
  exports: [PresenceClient],
})
export class PresenceModule {}

import { Module, Global } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PresenceClient } from './presence.client';
import { PresenceController } from './presence.controller';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [PresenceController],
  providers: [PresenceClient],
  exports: [PresenceClient],
})
export class PresenceModule {}

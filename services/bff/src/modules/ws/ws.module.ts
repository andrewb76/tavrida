import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatsModule } from '../chats/chats.module';
import { MediaModule } from '../media/media.module';
import { ScalarConfigModule } from '../scalar-config/scalar-config.module';
import { ChatWsRelayConsumer } from './chat-ws-relay.consumer';
import { WsHubService } from './ws-hub.service';

@Module({
  imports: [AuthModule, ChatsModule, ScalarConfigModule, MediaModule],
  providers: [WsHubService, ChatWsRelayConsumer],
  exports: [WsHubService],
})
export class WsModule {}

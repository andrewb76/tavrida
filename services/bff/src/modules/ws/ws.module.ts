import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuctionModule } from '../auction/auction.module';
import { ChatsModule } from '../chats/chats.module';
import { ForumModule } from '../forum/forum.module';
import { MediaModule } from '../media/media.module';
import { ScalarConfigModule } from '../scalar-config/scalar-config.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { AuctionWsRelayConsumer } from './auction-ws-relay.consumer';
import { ChatWsRelayConsumer } from './chat-ws-relay.consumer';
import { ForumWsRelayConsumer } from './forum-ws-relay.consumer';
import { WsHubService } from './ws-hub.service';

@Module({
  imports: [
    AuthModule,
    AuctionModule,
    ChatsModule,
    ForumModule,
    ScalarConfigModule,
    MediaModule,
    UserProfileModule,
  ],
  providers: [
    WsHubService,
    AuctionWsRelayConsumer,
    ChatWsRelayConsumer,
    ForumWsRelayConsumer,
  ],
  exports: [WsHubService],
})
export class WsModule {}

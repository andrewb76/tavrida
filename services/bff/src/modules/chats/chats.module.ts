import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ForumClient } from '../forum/forum.client';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { ChatClient } from './chat.client';
import { ChatsController } from './chats.controller';

@Module({
  imports: [AuthModule, PlanConfigModule, UserProfileModule],
  controllers: [ChatsController],
  providers: [ChatClient, ForumClient],
  exports: [ChatClient],
})
export class ChatsModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ForumClient } from '../forum/forum.client';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { ScalarConfigModule } from '../scalar-config/scalar-config.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { ChatClient } from './chat.client';
import { ChatScalarBootstrapService } from './chat-scalar-bootstrap.service';
import { ChatsController } from './chats.controller';

@Module({
  imports: [AuthModule, PlanConfigModule, ScalarConfigModule, UserProfileModule],
  controllers: [ChatsController],
  providers: [ChatClient, ForumClient, ChatScalarBootstrapService],
  exports: [ChatClient],
})
export class ChatsModule {}

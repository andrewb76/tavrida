import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMemberEntity } from '../../entities/chat-member.entity';
import { ChatEntity } from '../../entities/chat.entity';
import { MessageAttachmentEntity } from '../../entities/message-attachment.entity';
import { MessageEntity } from '../../entities/message.entity';
import { ChatsService } from './chats.service';
import { InternalChatsController } from './internal-chats.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatEntity,
      ChatMemberEntity,
      MessageEntity,
      MessageAttachmentEntity,
    ]),
  ],
  controllers: [InternalChatsController],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}

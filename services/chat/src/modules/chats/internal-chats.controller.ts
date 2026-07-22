import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { ChatKind, MessageMention } from '../../common/chat.types';
import { ChatsService } from './chats.service';

class EnsureDirectDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsString()
  @MinLength(1)
  peerUserId!: string;
}

class EnsureSelfDto {
  @IsString()
  @MinLength(1)
  userId!: string;
}

class EnsureTopicDto {
  @IsUUID()
  topicId!: string;

  @IsString()
  @MinLength(1)
  authorId!: string;
}

class AddTopicMemberDto {
  @IsUUID()
  topicId!: string;

  @IsString()
  @MinLength(1)
  userId!: string;
}

class MentionDto {
  @IsString()
  userId!: string;

  @IsString()
  username!: string;

  @IsInt()
  @Min(0)
  offset!: number;

  @IsInt()
  @Min(1)
  length!: number;
}

class SendMessageDto {
  @IsString()
  @MinLength(1)
  authorId!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MentionDto)
  mentions?: MessageMention[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

class MarkReadDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsOptional()
  @IsUUID()
  messageId?: string;
}

@Controller('internal/v1/chats')
export class InternalChatsController {
  constructor(private readonly chats: ChatsService) {}

  @Get()
  list(
    @Query('userId') userId: string,
    @Query('kind') kind?: ChatKind,
  ) {
    return this.chats.listForUser(userId, kind);
  }

  @Get('unread')
  unread(@Query('userId') userId: string) {
    return this.chats.getUnreadAggregate(userId);
  }

  @Post('direct/ensure')
  ensureDirect(@Body() body: EnsureDirectDto) {
    return this.chats.ensureDirect(body.userId, body.peerUserId);
  }

  @Post('self/ensure')
  ensureSelf(@Body() body: EnsureSelfDto) {
    return this.chats.ensureSelf(body.userId);
  }

  @Post('topic/ensure')
  ensureTopic(@Body() body: EnsureTopicDto) {
    return this.chats.ensureTopic(body.topicId, body.authorId);
  }

  @Post('topic/members/add')
  addTopicMember(@Body() body: AddTopicMemberDto) {
    return this.chats.addTopicMember(body.topicId, body.userId);
  }

  @Get(':chatId')
  get(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query('userId') userId: string,
  ) {
    return this.chats.getChatForMember(chatId, userId);
  }

  @Get(':chatId/messages')
  messages(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.chats.listMessages(
      chatId,
      userId,
      limit ? Number(limit) : 50,
    );
  }

  @Post(':chatId/messages')
  send(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() body: SendMessageDto,
  ) {
    return this.chats.sendMessage({
      chatId,
      authorId: body.authorId,
      body: body.body,
      mentions: body.mentions,
      attachmentIds: body.attachmentIds,
    });
  }

  @Post(':chatId/read')
  read(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() body: MarkReadDto,
  ) {
    return this.chats.markRead(chatId, body.userId, body.messageId);
  }
}

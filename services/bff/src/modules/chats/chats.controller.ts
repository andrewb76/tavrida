import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ForumClient } from '../forum/forum.client';
import { PlanConfigClient } from '../plan-config/plan-config.client';
import { UserProfileClient } from '../user-profile/user-profile.client';
import { ChatClient, type ChatKind } from './chat.client';

const DM_FEATURE = 'chat.member.dm.enabled';
const SELF_FEATURE = 'chat.member.self.enabled';
const GROUP_FEATURE = 'chat.member.group.enabled';
const ATTACHMENT_FEATURE = 'chat.member.attachment.enabled';
const MENTION_FEATURE = 'chat.member.mention.enabled';
const TOPIC_FEATURE = 'forum.author.13topic.chatEnabled';

const CHAT_KINDS = ['DIRECT', 'GROUP', 'TOPIC'] as const;

class OpenDirectDto {
  @IsString()
  @MinLength(1)
  userId!: string;
}

class SendMessageDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

class MarkReadDto {
  @IsOptional()
  @IsUUID()
  messageId?: string;
}

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(
    private readonly chat: ChatClient,
    private readonly planConfig: PlanConfigClient,
    private readonly forum: ForumClient,
    private readonly users: UserProfileClient,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('kind') kind?: string,
  ) {
    if (kind && !CHAT_KINDS.includes(kind as (typeof CHAT_KINDS)[number])) {
      throw new BadRequestException('Invalid kind');
    }
    return this.chat.list(user.sub, kind as ChatKind | undefined);
  }

  @Get('unread')
  unread(@CurrentUser() user: AuthUser) {
    return this.chat.unread(user.sub);
  }

  @Get('self')
  async self(@CurrentUser() user: AuthUser) {
    await this.assertFeature(user.sub, SELF_FEATURE, 'Self-DM is not available on your plan');
    return this.chat.ensureSelf(user.sub);
  }

  @Get('users/search')
  async searchUsers(@Query('q') q?: string) {
    const query = q?.trim() ?? '';
    if (query.length < 1) {
      return { data: [] };
    }
    const result = await this.users.listUsers({ q: query, limit: 10, offset: 0 });
    return {
      data: (result.data ?? [])
        .filter((row) => row.username)
        .map((row) => ({
          userId: row.userId,
          username: row.username,
          displayName: row.displayName,
          avatarUrl: row.avatarUrl,
        })),
    };
  }

  @Post('direct')
  async openDirect(@CurrentUser() user: AuthUser, @Body() body: OpenDirectDto) {
    if (body.userId === user.sub) {
      throw new BadRequestException('Use GET /chats/self for notes');
    }
    await this.assertFeature(user.sub, DM_FEATURE, 'Direct messages are not available on your plan');
    await this.assertFeature(
      body.userId,
      DM_FEATURE,
      'Peer cannot receive direct messages on their plan',
    );
    return this.chat.ensureDirect(user.sub, body.userId);
  }

  @Get('topics/:forumTopicId')
  async topicChat(
    @CurrentUser() user: AuthUser,
    @Param('forumTopicId', ParseUUIDPipe) forumTopicId: string,
  ) {
    await this.assertFeature(
      user.sub,
      TOPIC_FEATURE,
      'Topic side chat is not available on your plan',
    );

    const topic = await this.forum.getTopic(forumTopicId);
    const authorId =
      typeof topic['authorId'] === 'string'
        ? topic['authorId']
        : typeof topic['author_id'] === 'string'
          ? topic['author_id']
          : null;
    if (!authorId) {
      throw new BadRequestException('Topic author missing');
    }

    const room = await this.chat.ensureTopic(forumTopicId, authorId);
    if (user.sub === authorId) {
      return room;
    }

    try {
      return await this.chat.get(room.id, user.sub);
    } catch (err) {
      if (err instanceof ForbiddenException) {
        throw new ForbiddenException(
          'Join topic side chat by commenting on the topic first',
        );
      }
      throw err;
    }
  }

  @Get(':chatId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
  ) {
    return this.chat.get(chatId, user.sub);
  }

  @Get(':chatId/messages')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query('limit') limit?: string,
  ) {
    return this.chat.listMessages(
      chatId,
      user.sub,
      limit ? Number(limit) : 50,
    );
  }

  @Post(':chatId/messages')
  async send(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() body: SendMessageDto,
  ) {
    const chat = await this.chat.get(chatId, user.sub);
    await this.assertCanWrite(user.sub, chat.kind, chat.self);

    if (body.attachmentIds?.length) {
      await this.assertFeature(
        user.sub,
        ATTACHMENT_FEATURE,
        'Attachments are not available on your plan',
      );
    }

    const mentions = await this.resolveMentions(user.sub, body.body);

    return this.chat.sendMessage({
      chatId,
      authorId: user.sub,
      body: body.body,
      mentions,
      attachmentIds: body.attachmentIds,
    });
  }

  @Post(':chatId/read')
  read(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() body: MarkReadDto,
  ) {
    return this.chat.markRead(chatId, user.sub, body.messageId);
  }

  private async assertCanWrite(userId: string, kind: ChatKind, self: boolean) {
    if (kind === 'DIRECT' && self) {
      await this.assertFeature(userId, SELF_FEATURE, 'Self-DM is not available on your plan');
      return;
    }
    if (kind === 'DIRECT') {
      await this.assertFeature(userId, DM_FEATURE, 'Direct messages are not available on your plan');
      return;
    }
    if (kind === 'GROUP') {
      await this.assertFeature(userId, GROUP_FEATURE, 'Group chat is not available on your plan');
      return;
    }
    if (kind === 'TOPIC') {
      await this.assertFeature(
        userId,
        TOPIC_FEATURE,
        'Topic side chat is not available on your plan',
      );
    }
  }

  private async assertFeature(userId: string, featureKey: string, message: string) {
    const feature = await this.planConfig.canUseFeature({ userId, featureKey });
    if (!feature.allowed) {
      throw new ForbiddenException({
        message,
        variableKey: featureKey,
        planId: feature.planId,
      });
    }
  }

  private async resolveMentions(authorId: string, body: string) {
    const matches = [...body.matchAll(/@([A-Za-z_][\w]{0,31})/g)];
    if (!matches.length) return [];

    const mentionFeature = await this.planConfig.canUseFeature({
      userId: authorId,
      featureKey: MENTION_FEATURE,
    });
    if (!mentionFeature.allowed) {
      return [];
    }

    const usernames = [...new Set(matches.map((m) => m[1]!.toLowerCase()))];
    const byUsername = new Map<
      string,
      { userId: string; username: string; displayName: string | null; avatarUrl: string | null }
    >();

    for (const name of usernames) {
      const more = await this.users.listUsers({ q: name, limit: 10 });
      for (const u of more.data ?? []) {
        if (u.username) {
          byUsername.set(u.username.toLowerCase(), {
            userId: u.userId,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
          });
        }
      }
    }

    const mentions: Array<{
      userId: string;
      username: string;
      offset: number;
      length: number;
    }> = [];

    for (const m of matches) {
      const username = m[1]!;
      const row = byUsername.get(username.toLowerCase());
      if (!row?.username || m.index == null) continue;
      mentions.push({
        userId: row.userId,
        username: row.username,
        offset: m.index,
        length: m[0]!.length,
      });
    }
    return mentions;
  }
}

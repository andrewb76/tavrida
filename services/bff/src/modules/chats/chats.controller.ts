import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ForumClient } from '../forum/forum.client';
import { MediaService } from '../media/media.service';
import { PlanConfigClient } from '../plan-config/plan-config.client';
import { ScalarConfigClient } from '../scalar-config/scalar-config.client';
import { UserProfileClient } from '../user-profile/user-profile.client';
import {
  ChatClient,
  type ChatDto,
  type ChatKind,
  type ChatListItemDto,
  type MessageDto,
} from './chat.client';

const DM_FEATURE = 'chat.member.dm.enabled';
const SELF_FEATURE = 'chat.member.self.enabled';
const GROUP_FEATURE = 'chat.member.group.enabled';
const GROUP_INVITE_FEATURE = 'chat.member.group.inviteEnabled';
const ATTACHMENT_FEATURE = 'chat.member.attachment.enabled';
const MENTION_FEATURE = 'chat.member.mention.enabled';
const TOPIC_FEATURE = 'forum.author.13topic.chatEnabled';
const GROUP_MEMBERSHIP_MAX = 'chat.member.group.membershipMax';
const GROUP_MEMBER_MAX = 'chat.member.group.memberMax';
const GROUP_CREATE_DAILY_MAX = 'chat.member.group.createDailyMax';
const SPAWN_COPY_MAX = 'chat.member.spawn.copyHistoryMax';

const CHAT_KINDS = ['DIRECT', 'GROUP', 'TOPIC'] as const;

class OpenDirectDto {
  @IsString()
  @MinLength(1)
  userId!: string;
}

class CreateGroupDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsArray()
  @IsString({ each: true })
  memberIds!: string[];
}

class SpawnGroupDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];

  @IsOptional()
  @IsBoolean()
  copyHistory?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  copyCount?: number;
}

class InviteMembersDto {
  @IsArray()
  @IsString({ each: true })
  memberIds!: string[];
}

class SendMessageDto {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];

  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;
}

class EditMessageDto {
  @IsString()
  @MinLength(1)
  body!: string;
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
    private readonly scalarConfig: ScalarConfigClient,
    private readonly media: MediaService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('kind') kind?: string,
    @Query('hidden') hidden?: string,
  ) {
    if (kind && !CHAT_KINDS.includes(kind as (typeof CHAT_KINDS)[number])) {
      throw new BadRequestException('Invalid kind');
    }
    const wantHidden = hidden === '1' || hidden === 'true';
    const rows = await this.chat.list(user.sub, kind as ChatKind | undefined, {
      hidden: wantHidden,
    });
    return this.enrichChatList(rows);
  }

  @Get('unread')
  unread(@CurrentUser() user: AuthUser) {
    return this.chat.unread(user.sub);
  }

  @Get('self')
  async self(@CurrentUser() user: AuthUser) {
    await this.assertFeature(user.sub, SELF_FEATURE, 'Self-DM is not available on your plan');
    return this.enrichChat(await this.chat.ensureSelf(user.sub));
  }

  @Get('users/search')
  async searchUsers(@Query('q') q?: string) {
    const query = q?.trim() ?? '';
    if (query.length < 1) {
      return { data: [] };
    }
    const result = await this.users.searchUsers({ q: query, limit: 10 });
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
    return this.enrichChat(await this.chat.ensureDirect(user.sub, body.userId));
  }

  @Post('groups')
  async createGroup(@CurrentUser() user: AuthUser, @Body() body: CreateGroupDto) {
    await this.assertFeature(user.sub, GROUP_FEATURE, 'Group chat is not available on your plan');
    await this.assertCanCreateGroup(user.sub, body.memberIds.length + 1);
    return this.enrichChat(
      await this.chat.createGroup({
        ownerId: user.sub,
        title: body.title,
        memberIds: body.memberIds,
      }),
    );
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
      return this.enrichChat(room);
    }

    try {
      return this.enrichChat(await this.chat.get(room.id, user.sub));
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
  async get(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
  ) {
    return this.enrichChat(await this.chat.get(chatId, user.sub));
  }

  @Post(':chatId/spawn-group')
  async spawnGroup(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() body: SpawnGroupDto,
  ) {
    await this.assertFeature(user.sub, GROUP_FEATURE, 'Group chat is not available on your plan');
    const extra = body.memberIds?.length ?? 0;
    await this.assertCanCreateGroup(user.sub, 2 + extra);

    const copyCount = await this.resolveSpawnCopyCount(
      user.sub,
      body.copyHistory === false ? 0 : (body.copyCount ?? 0),
    );

    return this.enrichChat(
      await this.chat.spawnGroup(chatId, {
        ownerId: user.sub,
        title: body.title,
        memberIds: body.memberIds,
        copyCount,
      }),
    );
  }

  @Post(':chatId/members')
  async inviteMembers(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() body: InviteMembersDto,
  ) {
    await this.assertFeature(user.sub, GROUP_FEATURE, 'Group chat is not available on your plan');
    await this.assertFeature(
      user.sub,
      GROUP_INVITE_FEATURE,
      'Inviting to groups is not available on your plan',
    );

    const current = await this.chat.countGroupMembers(chatId);
    const memberMax = await this.planConfig.resolveLimitValue(user.sub, GROUP_MEMBER_MAX);
    if (memberMax != null && memberMax >= 0 && current.count + body.memberIds.length > memberMax) {
      throw new ForbiddenException({
        message: 'Group member limit exceeded',
        variableKey: GROUP_MEMBER_MAX,
        limit: memberMax,
      });
    }

    return this.enrichChat(
      await this.chat.inviteMembers(chatId, user.sub, body.memberIds),
    );
  }

  @Post(':chatId/leave')
  leave(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
  ) {
    return this.chat.leaveGroup(chatId, user.sub);
  }

  @Post(':chatId/hide')
  hide(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
  ) {
    return this.chat.hide(chatId, user.sub);
  }

  @Post(':chatId/unhide')
  unhide(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
  ) {
    return this.chat.unhide(chatId, user.sub);
  }

  @Get(':chatId/messages')
  async messages(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query('cursor') cursor?: string,
    @Query('loaded') loadedRaw?: string,
  ) {
    await this.chat.get(chatId, user.sub);
    const pageSize = await this.chatMessagePageSize();
    const historyMaxRaw = await this.planConfig.resolveLimitValue(
      user.sub,
      'chat.member.message.historyMax',
    );
    const historyMax =
      historyMaxRaw == null || historyMaxRaw < 0 ? -1 : historyMaxRaw;
    const alreadyLoaded = Math.max(0, Number(loadedRaw ?? 0) || 0);

    let limit = pageSize;
    if (historyMax >= 0) {
      const remaining = historyMax - alreadyLoaded;
      if (remaining <= 0) {
        return {
          data: [],
          nextCursor: null,
          pageSize,
          historyMax,
          historyCapReached: true,
        };
      }
      limit = Math.min(pageSize, remaining);
    }

    const page = await this.chat.listMessages(chatId, user.sub, {
      limit,
      cursor: cursor || null,
    });
    const data = await this.enrichMessages(page.data);
    const loadedAfter = alreadyLoaded + data.length;
    const historyCapReached = historyMax >= 0 && loadedAfter >= historyMax;
    return {
      data,
      nextCursor: historyCapReached ? null : page.nextCursor,
      pageSize,
      historyMax,
      historyCapReached,
    };
  }

  @Post(':chatId/messages')
  async send(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() body: SendMessageDto,
  ) {
    const text = body.body?.trim() ?? '';
    const attachmentIds = [...new Set(body.attachmentIds ?? [])];
    if (!text && !attachmentIds.length) {
      throw new BadRequestException('body or attachmentIds required');
    }

    const chat = await this.chat.get(chatId, user.sub);
    await this.assertCanWrite(user.sub, chat.kind, chat.self);

    if (attachmentIds.length) {
      await this.assertFeature(
        user.sub,
        ATTACHMENT_FEATURE,
        'Attachments are not available on your plan',
      );
      const limits = await this.media.getLimits(user.sub, 'chat');
      if (attachmentIds.length > limits.countMax) {
        throw new BadRequestException(
          `Максимум вложений: ${limits.countMax}`,
        );
      }
      await this.media.assertChatAttachmentsOwned(user.sub, attachmentIds);
    }

    const mentions = text ? await this.resolveMentions(user.sub, text) : [];

    const msg = await this.chat.sendMessage({
      chatId,
      authorId: user.sub,
      body: text,
      mentions,
      attachmentIds,
      replyToMessageId: body.replyToMessageId,
    });
    const [enriched] = await this.enrichMessages([msg]);
    return enriched;
  }

  @Patch(':chatId/messages/:messageId')
  async editMessage(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() body: EditMessageDto,
  ) {
    await this.chat.get(chatId, user.sub);
    const mentions = await this.resolveMentions(user.sub, body.body);
    const editWindowMinutes = await this.chatEditWindowMinutes();
    const msg = await this.chat.editMessage({
      chatId,
      messageId,
      authorId: user.sub,
      body: body.body,
      mentions,
      editWindowMinutes,
    });
    const [enriched] = await this.enrichMessages([msg]);
    return enriched;
  }

  @Delete(':chatId/messages/:messageId')
  async deleteMessage(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    await this.chat.get(chatId, user.sub);
    const deleteWindowMinutes = await this.chatDeleteWindowMinutes();
    const msg = await this.chat.deleteMessage({
      chatId,
      messageId,
      authorId: user.sub,
      deleteWindowMinutes,
    });
    const [enriched] = await this.enrichMessages([msg]);
    return enriched;
  }

  @Post(':chatId/read')
  read(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() body: MarkReadDto,
  ) {
    return this.chat.markRead(chatId, user.sub, body.messageId);
  }

  private async chatEditWindowMinutes(): Promise<number> {
    const settings = await this.scalarConfig.getChatSettings();
    const v = settings['message.editWindowMinutes'];
    return typeof v === 'number' ? v : 15;
  }

  private async chatMessagePageSize(): Promise<number> {
    const settings = await this.scalarConfig.getChatSettings();
    const v = settings['message.pageSize'];
    const n = typeof v === 'number' ? v : 50;
    return Math.min(Math.max(n, 1), 100);
  }

  private async chatDeleteWindowMinutes(): Promise<number> {
    const settings = await this.scalarConfig.getChatSettings();
    const v = settings['message.deleteOwnWindowMinutes'];
    return typeof v === 'number' ? v : 60;
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

  private async assertCanCreateGroup(userId: string, resultingMemberCount: number) {
    const createdToday = await this.chat.countGroupsCreatedToday(userId);
    const createCheck = await this.planConfig.checkLimit({
      userId,
      variableKey: GROUP_CREATE_DAILY_MAX,
      requestedValue: 1,
      currentUsage: createdToday.count,
    });
    if (!createCheck.allowed) {
      throw new HttpException(
        {
          message: 'Daily group create limit exceeded',
          variableKey: GROUP_CREATE_DAILY_MAX,
          limit: createCheck.limit,
        },
        429,
      );
    }

    const memberships = await this.chat.countGroupMemberships(userId);
    const membershipCheck = await this.planConfig.checkLimit({
      userId,
      variableKey: GROUP_MEMBERSHIP_MAX,
      requestedValue: 1,
      currentUsage: memberships.count,
    });
    if (!membershipCheck.allowed) {
      throw new ForbiddenException({
        message: 'Group membership limit exceeded',
        variableKey: GROUP_MEMBERSHIP_MAX,
        limit: membershipCheck.limit,
      });
    }

    const memberMax = await this.planConfig.resolveLimitValue(userId, GROUP_MEMBER_MAX);
    if (memberMax != null && memberMax >= 0 && resultingMemberCount > memberMax) {
      throw new ForbiddenException({
        message: 'Group member limit exceeded',
        variableKey: GROUP_MEMBER_MAX,
        limit: memberMax,
      });
    }
  }

  private async resolveSpawnCopyCount(userId: string, requested: number): Promise<number> {
    if (requested <= 0) return 0;
    const planMax = (await this.planConfig.resolveLimitValue(userId, SPAWN_COPY_MAX)) ?? 0;
    const chatSettings = await this.scalarConfig.getChatSettings();
    const scalarMax =
      typeof chatSettings['spawn.copyHistoryMax'] === 'number'
        ? chatSettings['spawn.copyHistoryMax']
        : 100;
    const cap = Math.min(
      planMax < 0 ? Number.POSITIVE_INFINITY : planMax,
      scalarMax < 0 ? Number.POSITIVE_INFINITY : scalarMax,
    );
    if (!Number.isFinite(cap)) return requested;
    return Math.max(0, Math.min(requested, Math.floor(cap)));
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
      const more = await this.users.searchUsers({ q: name, limit: 10 });
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

  private async enrichMessages(rows: MessageDto[]): Promise<MessageDto[]> {
    const attachmentIds = [
      ...new Set(
        rows.flatMap((m) =>
          (m.attachments ?? [])
            .map((a) =>
              'mediaObjectId' in a && typeof a.mediaObjectId === 'string'
                ? a.mediaObjectId
                : 'id' in a && typeof a.id === 'string'
                  ? a.id
                  : null,
            )
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    ];
    const authorIds = [
      ...new Set(
        rows.flatMap((m) => {
          const ids = [m.authorId];
          if (m.replyTo?.authorId) ids.push(m.replyTo.authorId);
          return ids;
        }).filter(Boolean),
      ),
    ];

    const [resolved, profiles] = await Promise.all([
      this.media.resolveReadyAttachments(attachmentIds),
      this.users.lookupByIds(authorIds),
    ]);
    const byAttachmentId = new Map(resolved.map((a) => [a.id, a]));
    const byUserId = new Map(profiles.map((p) => [p.userId, p]));

    return rows.map((msg) => {
      const profile = byUserId.get(msg.authorId);
      const replyProfile = msg.replyTo?.authorId
        ? byUserId.get(msg.replyTo.authorId)
        : undefined;
      return {
        ...msg,
        author: profile
          ? {
              userId: profile.userId,
              displayName: profile.displayName,
              username: profile.username,
              avatarUrl: profile.avatarUrl,
            }
          : {
              userId: msg.authorId,
              displayName: null,
              username: null,
              avatarUrl: null,
            },
        replyTo: msg.replyTo
          ? {
              ...msg.replyTo,
              authorDisplayName:
                replyProfile?.displayName?.trim() ||
                (replyProfile?.username ? `@${replyProfile.username}` : null),
            }
          : msg.replyTo,
        attachments: (msg.attachments ?? [])
          .map((a) => {
            const id =
              'mediaObjectId' in a && typeof a.mediaObjectId === 'string'
                ? a.mediaObjectId
                : 'id' in a && typeof a.id === 'string'
                  ? a.id
                  : null;
            return id ? byAttachmentId.get(id) : undefined;
          })
          .filter((a): a is NonNullable<typeof a> => Boolean(a))
          .map((a) => ({
            id: a.id,
            url: a.url,
            filename: a.filename,
            contentType: a.contentType,
            sizeBytes: a.sizeBytes,
          })),
      };
    });
  }

  private async enrichChatList(rows: ChatListItemDto[]) {
    const peerIds = [
      ...new Set(
        rows
          .map((r) => r.peerUserId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const profiles = await this.users.lookupByIds(peerIds);
    const byId = new Map(profiles.map((p) => [p.userId, p]));

    return rows.map((row) => {
      const peer = row.peerUserId ? byId.get(row.peerUserId) ?? null : null;
      return {
        ...row,
        peer: peer
          ? {
              userId: peer.userId,
              displayName: peer.displayName,
              username: peer.username,
              avatarUrl: peer.avatarUrl,
            }
          : null,
        displayTitle: this.displayTitleFor(row, peer),
      };
    });
  }

  private async enrichChat(chat: ChatDto) {
    const peerId = chat.peerUserId ?? null;
    const peerRow =
      peerId != null
        ? (await this.users.lookupByIds([peerId]))[0] ?? null
        : null;
    const peer = peerRow
      ? {
          userId: peerRow.userId,
          displayName: peerRow.displayName,
          username: peerRow.username,
          avatarUrl: peerRow.avatarUrl,
        }
      : null;
    return {
      ...chat,
      peer,
      displayTitle: this.displayTitleFor(chat, peer),
    };
  }

  private displayTitleFor(
    chat: {
      kind: ChatKind;
      self: boolean;
      title: string | null;
    },
    peer: {
      displayName: string | null;
      username: string | null;
    } | null,
  ): string {
    if (chat.self) return 'Заметки';
    if (chat.kind === 'DIRECT') {
      const name = peer?.displayName?.trim();
      if (name) return name;
      const username = peer?.username?.trim();
      if (username) return `@${username}`;
      return 'Участник';
    }
    const title = chat.title?.trim();
    if (title) return title;
    if (chat.kind === 'GROUP') return 'Группа';
    return 'Тема форума';
  }
}

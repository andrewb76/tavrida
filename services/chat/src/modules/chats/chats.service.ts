import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository, type EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  computeMessageDeliveryStatus,
  directPairKey,
  directSelfKey,
  type ChatKind,
  type MessageDeliveryStatus,
  type MessageMention,
} from '../../common/chat.types';
import { ChatMemberEntity } from '../../entities/chat-member.entity';
import { ChatEntity } from '../../entities/chat.entity';
import { MessageAttachmentEntity } from '../../entities/message-attachment.entity';
import { MessageEntity } from '../../entities/message.entity';
import { ChatEventsPublisher } from '../events/chat-events.publisher';

export type ChatListItem = {
  id: string;
  kind: ChatKind;
  self: boolean;
  title: string | null;
  contextType: string | null;
  contextId: string | null;
  peerUserId: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageAuthorId: string | null;
};

export type ChatPublicDto = {
  id: string;
  kind: ChatKind;
  self: boolean;
  title: string | null;
  contextType: string | null;
  contextId: string | null;
  peerUserId: string | null;
  directKey?: string | null;
  createdAt?: string;
};

export type MessageReplyPreview = {
  id: string;
  authorId: string;
  body: string;
  deleted: boolean;
};

export type MessageAttachmentDto = {
  mediaObjectId: string;
  sortOrder: number;
};

export type MessagePublicDto = {
  id: string;
  chatId: string;
  authorId: string;
  body: string;
  mentions: MessageMention[];
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  status: MessageDeliveryStatus | null;
  replyToMessageId: string | null;
  replyTo: MessageReplyPreview | null;
  attachments: MessageAttachmentDto[];
};

export type MessageListPage = {
  data: MessagePublicDto[];
  nextCursor: string | null;
};

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chats: Repository<ChatEntity>,
    @InjectRepository(ChatMemberEntity)
    private readonly members: Repository<ChatMemberEntity>,
    @InjectRepository(MessageEntity)
    private readonly messages: Repository<MessageEntity>,
    @InjectRepository(MessageAttachmentEntity)
    private readonly attachments: Repository<MessageAttachmentEntity>,
    private readonly dataSource: DataSource,
    private readonly events: ChatEventsPublisher,
  ) {}

  async ensureDirect(userId: string, peerUserId: string): Promise<ChatPublicDto> {
    if (!userId || !peerUserId) {
      throw new BadRequestException('userId and peerUserId are required');
    }
    if (userId === peerUserId) {
      throw new BadRequestException('Use ensureSelf for self-DM');
    }

    const key = directPairKey(userId, peerUserId);
    const existing = await this.chats.findOne({ where: { directKey: key } });
    if (existing) {
      await this.ensureMember(existing.id, userId, 'MEMBER');
      await this.ensureMember(existing.id, peerUserId, 'MEMBER');
      return this.toChatPublic(existing, userId);
    }

    const chat = this.chats.create({
      id: uuidv4(),
      kind: 'DIRECT',
      self: false,
      directKey: key,
      contextType: null,
      contextId: null,
      title: null,
      spawnedFromChatId: null,
    });
    await this.chats.save(chat);
    await this.ensureMember(chat.id, userId, 'MEMBER');
    await this.ensureMember(chat.id, peerUserId, 'MEMBER');
    return this.toChatPublic(chat, userId);
  }

  async ensureSelf(userId: string): Promise<ChatPublicDto> {
    if (!userId) throw new BadRequestException('userId is required');

    const key = directSelfKey(userId);
    const existing = await this.chats.findOne({ where: { directKey: key } });
    if (existing) {
      await this.ensureMember(existing.id, userId, 'MEMBER');
      return this.toChatPublic(existing, userId);
    }

    const chat = this.chats.create({
      id: uuidv4(),
      kind: 'DIRECT',
      self: true,
      directKey: key,
      contextType: null,
      contextId: null,
      title: 'Заметки',
      spawnedFromChatId: null,
    });
    await this.chats.save(chat);
    await this.ensureMember(chat.id, userId, 'MEMBER');
    return this.toChatPublic(chat, userId);
  }

  async ensureTopic(topicId: string, authorId: string): Promise<ChatPublicDto> {
    if (!topicId || !authorId) {
      throw new BadRequestException('topicId and authorId are required');
    }

    const existing = await this.chats.findOne({
      where: { contextType: 'FORUM_TOPIC', contextId: topicId },
    });
    if (existing) {
      await this.ensureMember(existing.id, authorId, 'MEMBER');
      return this.toChatPublic(existing, authorId);
    }

    const chat = this.chats.create({
      id: uuidv4(),
      kind: 'TOPIC',
      self: false,
      directKey: null,
      contextType: 'FORUM_TOPIC',
      contextId: topicId,
      title: null,
      spawnedFromChatId: null,
    });
    await this.chats.save(chat);
    await this.ensureMember(chat.id, authorId, 'MEMBER');
    return this.toChatPublic(chat, authorId);
  }

  async addTopicMember(topicId: string, userId: string): Promise<ChatPublicDto> {
    const chat = await this.chats.findOne({
      where: { contextType: 'FORUM_TOPIC', contextId: topicId },
    });
    if (!chat) {
      throw new NotFoundException('TOPIC chat not found; ensure topic first');
    }
    await this.ensureMember(chat.id, userId, 'MEMBER');
    return this.toChatPublic(chat, userId);
  }

  async createGroup(input: {
    ownerId: string;
    title?: string | null;
    memberIds: string[];
  }): Promise<ChatPublicDto> {
    const chat = await this.createGroupEntity(input);
    return this.toChatPublic(chat, input.ownerId);
  }

  async spawnGroupFromDirect(input: {
    directChatId: string;
    ownerId: string;
    title?: string | null;
    memberIds?: string[];
    copyCount: number;
  }): Promise<ChatPublicDto> {
    const direct = await this.requireChatEntityForMember(input.directChatId, input.ownerId);
    if (direct.kind !== 'DIRECT') {
      throw new ConflictException('Spawn is only allowed from DIRECT chats');
    }
    if (direct.self) {
      throw new ConflictException('Cannot spawn a group from self-DM');
    }

    const directMembers = await this.members.find({
      where: { chatId: direct.id, leftAt: IsNull() },
    });
    const peerIds = directMembers
      .map((m) => m.userId)
      .filter((id) => id !== input.ownerId);

    const extra = (input.memberIds ?? []).filter(
      (id) => id && id !== input.ownerId && !peerIds.includes(id),
    );
    const memberIds = [...peerIds, ...extra];

    const group = await this.createGroupEntity({
      ownerId: input.ownerId,
      title: input.title,
      memberIds,
    });
    group.spawnedFromChatId = direct.id;
    await this.chats.save(group);

    const copyCount = Math.max(0, Math.floor(input.copyCount));
    if (copyCount > 0) {
      const source = await this.messages.find({
        where: { chatId: direct.id, deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
        take: copyCount,
      });
      const chronological = [...source].reverse();
      for (const msg of chronological) {
        await this.messages.save(
          this.messages.create({
            id: uuidv4(),
            chatId: group.id,
            authorId: msg.authorId,
            body: msg.body,
            mentions: msg.mentions ?? [],
            editedAt: null,
            deletedAt: null,
          }),
        );
      }
    }

    return this.toChatPublic(group, input.ownerId);
  }

  async inviteMembers(input: {
    chatId: string;
    actorId: string;
    memberIds: string[];
  }): Promise<ChatPublicDto> {
    const chat = await this.requireChatEntityForMember(input.chatId, input.actorId);
    if (chat.kind !== 'GROUP') {
      throw new BadRequestException('Invite is only for GROUP chats');
    }

    const actor = await this.members.findOne({
      where: { chatId: chat.id, userId: input.actorId, leftAt: IsNull() },
    });
    if (!actor || (actor.role !== 'OWNER' && actor.role !== 'MEMBER')) {
      throw new ForbiddenException('Not a chat member');
    }

    const ids = [...new Set(input.memberIds.filter(Boolean))];
    for (const userId of ids) {
      if (userId === input.actorId) continue;
      await this.ensureMember(chat.id, userId, 'MEMBER');
    }
    return this.toChatPublic(chat, input.actorId);
  }

  async leaveGroup(chatId: string, userId: string): Promise<void> {
    const chat = await this.chats.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.kind !== 'GROUP') {
      throw new BadRequestException('Leave is only for GROUP chats');
    }

    const member = await this.members.findOne({
      where: { chatId, userId, leftAt: IsNull() },
    });
    if (!member) throw new ForbiddenException('Not a chat member');

    if (member.role === 'OWNER') {
      const others = await this.members.find({
        where: { chatId, leftAt: IsNull() },
      });
      const nextOwner = others.find((m) => m.userId !== userId);
      if (nextOwner) {
        nextOwner.role = 'OWNER';
        await this.members.save(nextOwner);
      }
    }

    member.leftAt = new Date();
    member.role = 'MEMBER';
    await this.members.save(member);
  }

  async countActiveGroupMemberships(userId: string): Promise<number> {
    return this.members
      .createQueryBuilder('m')
      .innerJoin(ChatEntity, 'c', 'c.id = m.chat_id')
      .where('m.user_id = :userId', { userId })
      .andWhere('m.left_at IS NULL')
      .andWhere('c.kind = :kind', { kind: 'GROUP' })
      .getCount();
  }

  async countGroupMembers(chatId: string): Promise<number> {
    return this.members.count({ where: { chatId, leftAt: IsNull() } });
  }

  async countGroupsCreatedToday(ownerId: string): Promise<number> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return this.members
      .createQueryBuilder('m')
      .innerJoin(ChatEntity, 'c', 'c.id = m.chat_id')
      .where('m.user_id = :ownerId', { ownerId })
      .andWhere('m.role = :role', { role: 'OWNER' })
      .andWhere('c.kind = :kind', { kind: 'GROUP' })
      .andWhere('c.created_at >= :start', { start })
      .getCount();
  }

  async listForUser(
    userId: string,
    kind?: ChatKind,
  ): Promise<ChatListItem[]> {
    const qb = this.members
      .createQueryBuilder('m')
      .innerJoin(ChatEntity, 'c', 'c.id = m.chat_id')
      .where('m.user_id = :userId', { userId })
      .andWhere('m.left_at IS NULL')
      .andWhere('m.hidden_at IS NULL')
      .orderBy('c.created_at', 'DESC');

    if (kind) {
      qb.andWhere('c.kind = :kind', { kind });
    }

    const rows = await qb
      .select([
        'c.id AS id',
        'c.kind AS kind',
        'c.self AS self',
        'c.title AS title',
        'c.context_type AS "contextType"',
        'c.context_id AS "contextId"',
        'm.last_read_at AS "lastReadAt"',
      ])
      .getRawMany<{
        id: string;
        kind: ChatKind;
        self: boolean;
        title: string | null;
        contextType: string | null;
        contextId: string | null;
        lastReadAt: Date | null;
      }>();

    const items: ChatListItem[] = [];
    for (const row of rows) {
      const unreadCount = await this.countUnread(row.id, userId, row.lastReadAt);
      const last = await this.messages.findOne({
        where: { chatId: row.id },
        order: { createdAt: 'DESC' },
      });
      const peerUserId = await this.resolvePeerUserId(row.id, userId, row.kind, row.self);
      let preview: string | null = null;
      if (last) {
        if (last.deletedAt) {
          preview = 'Сообщение удалено';
        } else if (last.body.trim()) {
          preview = last.body.slice(0, 120);
        } else {
          const attCount = await this.attachments.count({
            where: { messageId: last.id },
          });
          preview = attCount > 0 ? 'Вложение' : '';
        }
      }
      items.push({
        id: row.id,
        kind: row.kind,
        self: row.self,
        title: row.title,
        contextType: row.contextType,
        contextId: row.contextId,
        peerUserId,
        unreadCount,
        lastMessageAt: last?.createdAt?.toISOString() ?? null,
        lastMessagePreview: preview,
        lastMessageAuthorId: last?.authorId ?? null,
      });
    }
    items.sort((a, b) => {
      const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      return tb - ta;
    });
    return items;
  }

  async hideChat(chatId: string, userId: string): Promise<void> {
    await this.requireChatEntityForMember(chatId, userId);
    await this.members.update({ chatId, userId }, { hiddenAt: new Date() });
  }

  async getUnreadAggregate(userId: string): Promise<{
    chatsWithUnread: number;
    totalUnreadMessages: number;
  }> {
    const list = await this.listForUser(userId);
    let chatsWithUnread = 0;
    let totalUnreadMessages = 0;
    for (const item of list) {
      if (item.unreadCount > 0) {
        chatsWithUnread += 1;
        totalUnreadMessages += item.unreadCount;
      }
    }
    return { chatsWithUnread, totalUnreadMessages };
  }

  async getChatForMember(chatId: string, userId: string): Promise<ChatPublicDto> {
    const chat = await this.requireChatEntityForMember(chatId, userId);
    return this.toChatPublic(chat, userId);
  }

  async listMessages(
    chatId: string,
    userId: string,
    opts: { limit?: number; cursor?: string | null } = {},
  ): Promise<MessageListPage> {
    const chat = await this.requireChatEntityForMember(chatId, userId);
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);

    const qb = this.messages
      .createQueryBuilder('m')
      .where('m.chat_id = :chatId', { chatId })
      .orderBy('m.created_at', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(limit + 1);

    if (opts.cursor) {
      const parsed = decodeMessageCursor(opts.cursor);
      qb.andWhere(
        '(m.created_at < :cAt OR (m.created_at = :cAt AND m.id < :cId))',
        { cAt: parsed.createdAt, cId: parsed.id },
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const otherReads = await this.otherMembersLastReadAt(chatId, userId);
    const replyMap = await this.loadReplyPreviews(page);
    const attachmentMap = await this.loadAttachments(page.map((r) => r.id));
    const data = page.map((msg) =>
      this.toMessagePublic(
        msg,
        userId,
        chat.self,
        otherReads,
        replyMap,
        attachmentMap.get(msg.id) ?? [],
      ),
    );
    const oldest = page[page.length - 1];
    return {
      data,
      nextCursor: hasMore && oldest ? encodeMessageCursor(oldest) : null,
    };
  }

  async sendMessage(input: {
    chatId: string;
    authorId: string;
    body: string;
    mentions?: MessageMention[];
    attachmentIds?: string[];
    replyToMessageId?: string | null;
  }): Promise<MessagePublicDto> {
    const body = input.body?.trim() ?? '';
    const attachmentIds = [...new Set((input.attachmentIds ?? []).filter(Boolean))];
    if (!body && !attachmentIds.length) {
      throw new BadRequestException('body or attachmentIds required');
    }

    const chat = await this.requireChatEntityForMember(input.chatId, input.authorId);

    let replyToMessageId: string | null = null;
    if (input.replyToMessageId) {
      const reply = await this.messages.findOne({
        where: { id: input.replyToMessageId, chatId: input.chatId },
      });
      if (!reply) throw new BadRequestException('replyToMessageId not in this chat');
      replyToMessageId = reply.id;
    }

    const dto = await this.dataSource.transaction(async (manager) => {
      const messagesRepo = manager.getRepository(MessageEntity);
      const attachmentsRepo = manager.getRepository(MessageAttachmentEntity);
      const membersRepo = manager.getRepository(ChatMemberEntity);

      const message = messagesRepo.create({
        id: uuidv4(),
        chatId: input.chatId,
        authorId: input.authorId,
        body,
        mentions: input.mentions ?? [],
        replyToMessageId,
        editedAt: null,
        deletedAt: null,
      });
      await messagesRepo.save(message);

      const attachmentRows: MessageAttachmentDto[] = [];
      for (let i = 0; i < attachmentIds.length; i += 1) {
        const mediaObjectId = attachmentIds[i]!;
        await attachmentsRepo.save(
          attachmentsRepo.create({
            messageId: message.id,
            mediaObjectId,
            sortOrder: i,
          }),
        );
        attachmentRows.push({ mediaObjectId, sortOrder: i });
      }

      await membersRepo.update(
        { chatId: input.chatId, userId: input.authorId },
        { lastReadAt: message.createdAt, lastReadMessageId: message.id },
      );
      await membersRepo.update({ chatId: input.chatId }, { hiddenAt: null });

      const replyMap = await this.loadReplyPreviews([message], manager);
      const replyTo = message.replyToMessageId
        ? (replyMap.get(message.replyToMessageId) ?? null)
        : null;

      await this.events.enqueueMessageCreated(manager, {
        messageId: message.id,
        chatId: input.chatId,
        kind: chat.kind,
        authorId: input.authorId,
        body: message.body,
        mentions: message.mentions ?? [],
        createdAt: message.createdAt,
        replyToMessageId: message.replyToMessageId,
        replyTo,
        attachmentIds,
      });

      const otherReads = await this.otherMembersLastReadAt(
        input.chatId,
        input.authorId,
        manager,
      );
      return this.toMessagePublic(
        message,
        input.authorId,
        chat.self,
        otherReads,
        replyMap,
        attachmentRows,
      );
    });

    this.events.flush();
    return dto;
  }

  async editMessage(input: {
    chatId: string;
    messageId: string;
    authorId: string;
    body: string;
    mentions?: MessageMention[];
    editWindowMinutes: number;
  }): Promise<MessagePublicDto> {
    const chat = await this.requireChatEntityForMember(input.chatId, input.authorId);
    const msg = await this.messages.findOne({
      where: { id: input.messageId, chatId: input.chatId },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');
    if (msg.authorId !== input.authorId) {
      throw new ForbiddenException('Can only edit your own messages');
    }
    this.assertWithinWindow(msg.createdAt, input.editWindowMinutes, 'edit');

    const body = input.body?.trim() ?? '';
    if (!body) throw new BadRequestException('body is required');
    msg.body = body;
    msg.mentions = input.mentions ?? msg.mentions ?? [];
    msg.editedAt = new Date();

    const dto = await this.dataSource.transaction(async (manager) => {
      const messagesRepo = manager.getRepository(MessageEntity);
      await messagesRepo.save(msg);
      await this.events.enqueueMessageEdited(manager, {
        messageId: msg.id,
        chatId: input.chatId,
        authorId: input.authorId,
        body: msg.body,
        mentions: msg.mentions ?? [],
        editedAt: msg.editedAt!,
      });
      const otherReads = await this.otherMembersLastReadAt(
        input.chatId,
        input.authorId,
        manager,
      );
      const replyMap = await this.loadReplyPreviews([msg], manager);
      return this.toMessagePublic(
        msg,
        input.authorId,
        chat.self,
        otherReads,
        replyMap,
        await this.loadAttachmentsForMessage(msg.id, manager),
      );
    });
    this.events.flush();
    return dto;
  }

  async deleteMessage(input: {
    chatId: string;
    messageId: string;
    authorId: string;
    deleteWindowMinutes: number;
  }): Promise<MessagePublicDto> {
    const chat = await this.requireChatEntityForMember(input.chatId, input.authorId);
    const msg = await this.messages.findOne({
      where: { id: input.messageId, chatId: input.chatId },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');
    if (msg.authorId !== input.authorId) {
      throw new ForbiddenException('Can only delete your own messages');
    }
    this.assertWithinWindow(msg.createdAt, input.deleteWindowMinutes, 'delete');

    msg.deletedAt = new Date();
    msg.body = '';
    msg.mentions = [];

    const dto = await this.dataSource.transaction(async (manager) => {
      const messagesRepo = manager.getRepository(MessageEntity);
      await messagesRepo.save(msg);
      await this.events.enqueueMessageDeleted(manager, {
        messageId: msg.id,
        chatId: input.chatId,
        authorId: input.authorId,
        deletedAt: msg.deletedAt!,
      });
      const otherReads = await this.otherMembersLastReadAt(
        input.chatId,
        input.authorId,
        manager,
      );
      const replyMap = await this.loadReplyPreviews([msg], manager);
      return this.toMessagePublic(
        msg,
        input.authorId,
        chat.self,
        otherReads,
        replyMap,
        await this.loadAttachmentsForMessage(msg.id, manager),
      );
    });
    this.events.flush();
    return dto;
  }

  async markRead(
    chatId: string,
    userId: string,
    messageId?: string,
  ): Promise<void> {
    const member = await this.members.findOne({
      where: { chatId, userId, leftAt: IsNull() },
    });
    if (!member) {
      await this.requireChatEntityForMember(chatId, userId);
      throw new ForbiddenException('Not a chat member');
    }

    let readAt = new Date();
    let readMessageId: string | null = messageId ?? null;
    if (messageId) {
      const msg = await this.messages.findOne({
        where: { id: messageId, chatId },
      });
      if (!msg) throw new NotFoundException('Message not found');
      readAt = msg.createdAt;
      readMessageId = msg.id;
    } else {
      const last = await this.messages.findOne({
        where: { chatId, deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
      });
      if (last) {
        readAt = last.createdAt;
        readMessageId = last.id;
      }
    }

    if (member.lastReadAt && member.lastReadAt.getTime() >= readAt.getTime()) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(ChatMemberEntity).update(
        { chatId, userId },
        { lastReadAt: readAt, lastReadMessageId: readMessageId },
      );
      await this.events.enqueueMessageRead(manager, {
        chatId,
        userId,
        lastReadMessageId: readMessageId,
        lastReadAt: readAt,
      });
    });
    this.events.flush();
  }

  private async createGroupEntity(input: {
    ownerId: string;
    title?: string | null;
    memberIds: string[];
  }): Promise<ChatEntity> {
    const ownerId = input.ownerId;
    const memberIds = [...new Set(input.memberIds.filter((id) => id && id !== ownerId))];
    if (!memberIds.length) {
      throw new BadRequestException('At least one other member is required');
    }

    const chat = this.chats.create({
      id: uuidv4(),
      kind: 'GROUP',
      self: false,
      directKey: null,
      contextType: null,
      contextId: null,
      title: input.title?.trim() || null,
      spawnedFromChatId: null,
    });
    await this.chats.save(chat);
    await this.ensureMember(chat.id, ownerId, 'OWNER');
    for (const memberId of memberIds) {
      await this.ensureMember(chat.id, memberId, 'MEMBER');
    }
    return chat;
  }

  private async requireChatEntityForMember(
    chatId: string,
    userId: string,
  ): Promise<ChatEntity> {
    const chat = await this.chats.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    const member = await this.members.findOne({
      where: { chatId, userId, leftAt: IsNull() },
    });
    if (!member) throw new ForbiddenException('Not a chat member');
    return chat;
  }

  private async resolvePeerUserId(
    chatId: string,
    viewerId: string,
    kind: ChatKind,
    self: boolean,
  ): Promise<string | null> {
    if (kind !== 'DIRECT' || self) return null;
    const peers = await this.members.find({
      where: { chatId, leftAt: IsNull() },
    });
    return peers.find((m) => m.userId !== viewerId)?.userId ?? null;
  }

  private async otherMembersLastReadAt(
    chatId: string,
    viewerId: string,
    manager?: EntityManager,
  ): Promise<Array<Date | null>> {
    const repo = manager
      ? manager.getRepository(ChatMemberEntity)
      : this.members;
    const peers = await repo.find({
      where: { chatId, leftAt: IsNull() },
    });
    return peers.filter((m) => m.userId !== viewerId).map((m) => m.lastReadAt);
  }

  private async toChatPublic(
    chat: ChatEntity,
    viewerId: string,
  ): Promise<ChatPublicDto> {
    const peerUserId = await this.resolvePeerUserId(
      chat.id,
      viewerId,
      chat.kind,
      chat.self,
    );
    return {
      id: chat.id,
      kind: chat.kind,
      self: chat.self,
      title: chat.title,
      contextType: chat.contextType,
      contextId: chat.contextId,
      peerUserId,
      directKey: chat.directKey,
      createdAt: chat.createdAt?.toISOString?.() ?? undefined,
    };
  }

  private toMessagePublic(
    msg: MessageEntity,
    viewerId: string,
    selfChat: boolean,
    otherMembersLastReadAt: Array<Date | null>,
    replyMap: Map<string, MessageReplyPreview> = new Map(),
    attachments: MessageAttachmentDto[] = [],
  ): MessagePublicDto {
    const replyToMessageId = msg.replyToMessageId ?? null;
    return {
      id: msg.id,
      chatId: msg.chatId,
      authorId: msg.authorId,
      body: msg.deletedAt ? '' : msg.body,
      mentions: msg.deletedAt ? [] : (msg.mentions ?? []),
      createdAt: msg.createdAt.toISOString(),
      editedAt: msg.editedAt?.toISOString() ?? null,
      deletedAt: msg.deletedAt?.toISOString() ?? null,
      status: computeMessageDeliveryStatus({
        authorId: msg.authorId,
        viewerId,
        selfChat,
        messageCreatedAt: msg.createdAt,
        otherMembersLastReadAt,
      }),
      replyToMessageId,
      replyTo: replyToMessageId ? (replyMap.get(replyToMessageId) ?? null) : null,
      attachments: msg.deletedAt ? [] : attachments,
    };
  }

  private async loadAttachments(
    messageIds: string[],
    manager?: EntityManager,
  ): Promise<Map<string, MessageAttachmentDto[]>> {
    const map = new Map<string, MessageAttachmentDto[]>();
    if (!messageIds.length) return map;
    const repo = manager
      ? manager.getRepository(MessageAttachmentEntity)
      : this.attachments;
    const rows = await repo.find({
      where: { messageId: In(messageIds) },
      order: { sortOrder: 'ASC' },
    });
    for (const row of rows) {
      const list = map.get(row.messageId) ?? [];
      list.push({ mediaObjectId: row.mediaObjectId, sortOrder: row.sortOrder });
      map.set(row.messageId, list);
    }
    return map;
  }

  private async loadAttachmentsForMessage(
    messageId: string,
    manager?: EntityManager,
  ): Promise<MessageAttachmentDto[]> {
    const map = await this.loadAttachments([messageId], manager);
    return map.get(messageId) ?? [];
  }

  private async loadReplyPreviews(
    rows: MessageEntity[],
    manager?: EntityManager,
  ): Promise<Map<string, MessageReplyPreview>> {
    const ids = [
      ...new Set(
        rows
          .map((r) => r.replyToMessageId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const map = new Map<string, MessageReplyPreview>();
    if (!ids.length) return map;
    const repo = manager ? manager.getRepository(MessageEntity) : this.messages;
    const found = await repo.find({
      where: { id: In(ids) },
    });
    for (const t of found) {
      map.set(t.id, {
        id: t.id,
        authorId: t.authorId,
        body: t.deletedAt ? '' : t.body.slice(0, 200),
        deleted: Boolean(t.deletedAt),
      });
    }
    return map;
  }

  private assertWithinWindow(
    createdAt: Date,
    windowMinutes: number,
    action: 'edit' | 'delete',
  ) {
    if (windowMinutes < 0) return;
    if (windowMinutes === 0) {
      throw new ForbiddenException(`Message ${action} is disabled`);
    }
    const deadline = createdAt.getTime() + windowMinutes * 60_000;
    if (Date.now() > deadline) {
      throw new ForbiddenException(`Message ${action} window expired`);
    }
  }

  private async ensureMember(
    chatId: string,
    userId: string,
    role: 'OWNER' | 'MEMBER',
  ): Promise<void> {
    const existing = await this.members.findOne({ where: { chatId, userId } });
    if (existing) {
      if (existing.leftAt) {
        existing.leftAt = null;
        existing.hiddenAt = null;
        existing.joinedAt = new Date();
        await this.members.save(existing);
      }
      return;
    }
    await this.members.save(
      this.members.create({
        chatId,
        userId,
        role,
        joinedAt: new Date(),
        hiddenAt: null,
        leftAt: null,
        lastReadMessageId: null,
        lastReadAt: null,
      }),
    );
  }

  private async countUnread(
    chatId: string,
    userId: string,
    lastReadAt: Date | null,
  ): Promise<number> {
    const qb = this.messages
      .createQueryBuilder('msg')
      .where('msg.chat_id = :chatId', { chatId })
      .andWhere('msg.deleted_at IS NULL')
      .andWhere('msg.author_id <> :userId', { userId });
    if (lastReadAt) {
      qb.andWhere('msg.created_at > :lastReadAt', { lastReadAt });
    }
    return qb.getCount();
  }
}

function encodeMessageCursor(msg: MessageEntity): string {
  const payload = JSON.stringify({
    t: msg.createdAt.toISOString(),
    i: msg.id,
  });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

function decodeMessageCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as { t?: string; i?: string };
    if (!parsed.t || !parsed.i) throw new Error('incomplete');
    const createdAt = new Date(parsed.t);
    if (Number.isNaN(createdAt.getTime())) throw new Error('bad date');
    return { createdAt, id: parsed.i };
  } catch {
    throw new BadRequestException('Invalid messages cursor');
  }
}

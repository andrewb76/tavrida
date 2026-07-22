import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  directPairKey,
  directSelfKey,
  type ChatKind,
  type MessageMention,
} from '../../common/chat.types';
import { ChatMemberEntity } from '../../entities/chat-member.entity';
import { ChatEntity } from '../../entities/chat.entity';
import { MessageAttachmentEntity } from '../../entities/message-attachment.entity';
import { MessageEntity } from '../../entities/message.entity';

export type ChatListItem = {
  id: string;
  kind: ChatKind;
  self: boolean;
  title: string | null;
  contextType: string | null;
  contextId: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
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
  ) {}

  async ensureDirect(userId: string, peerUserId: string): Promise<ChatEntity> {
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
      return existing;
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
    return chat;
  }

  async ensureSelf(userId: string): Promise<ChatEntity> {
    if (!userId) throw new BadRequestException('userId is required');

    const key = directSelfKey(userId);
    const existing = await this.chats.findOne({ where: { directKey: key } });
    if (existing) {
      await this.ensureMember(existing.id, userId, 'MEMBER');
      return existing;
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
    return chat;
  }

  async ensureTopic(topicId: string, authorId: string): Promise<ChatEntity> {
    if (!topicId || !authorId) {
      throw new BadRequestException('topicId and authorId are required');
    }

    const existing = await this.chats.findOne({
      where: { contextType: 'FORUM_TOPIC', contextId: topicId },
    });
    if (existing) {
      await this.ensureMember(existing.id, authorId, 'MEMBER');
      return existing;
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
    return chat;
  }

  async addTopicMember(topicId: string, userId: string): Promise<ChatEntity> {
    const chat = await this.chats.findOne({
      where: { contextType: 'FORUM_TOPIC', contextId: topicId },
    });
    if (!chat) {
      throw new NotFoundException('TOPIC chat not found; ensure topic first');
    }
    await this.ensureMember(chat.id, userId, 'MEMBER');
    return chat;
  }

  async createGroup(input: {
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

  async spawnGroupFromDirect(input: {
    directChatId: string;
    ownerId: string;
    title?: string | null;
    memberIds?: string[];
    copyCount: number;
  }): Promise<ChatEntity> {
    const direct = await this.getChatForMember(input.directChatId, input.ownerId);
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

    const group = await this.createGroup({
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

    return group;
  }

  async inviteMembers(input: {
    chatId: string;
    actorId: string;
    memberIds: string[];
  }): Promise<ChatEntity> {
    const chat = await this.getChatForMember(input.chatId, input.actorId);
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
    return chat;
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
        where: { chatId: row.id, deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
      });
      items.push({
        id: row.id,
        kind: row.kind,
        self: row.self,
        title: row.title,
        contextType: row.contextType,
        contextId: row.contextId,
        unreadCount,
        lastMessageAt: last?.createdAt?.toISOString() ?? null,
      });
    }
    return items;
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

  async getChatForMember(chatId: string, userId: string): Promise<ChatEntity> {
    const chat = await this.chats.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    const member = await this.members.findOne({
      where: { chatId, userId, leftAt: IsNull() },
    });
    if (!member) throw new ForbiddenException('Not a chat member');
    return chat;
  }

  async listMessages(
    chatId: string,
    userId: string,
    limit = 50,
  ): Promise<MessageEntity[]> {
    await this.getChatForMember(chatId, userId);
    return this.messages.find({
      where: { chatId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async sendMessage(input: {
    chatId: string;
    authorId: string;
    body: string;
    mentions?: MessageMention[];
    attachmentIds?: string[];
  }): Promise<MessageEntity> {
    const body = input.body?.trim() ?? '';
    if (!body) throw new BadRequestException('body is required');

    await this.getChatForMember(input.chatId, input.authorId);

    const message = this.messages.create({
      id: uuidv4(),
      chatId: input.chatId,
      authorId: input.authorId,
      body,
      mentions: input.mentions ?? [],
      editedAt: null,
      deletedAt: null,
    });
    await this.messages.save(message);

    const attachmentIds = input.attachmentIds ?? [];
    for (let i = 0; i < attachmentIds.length; i += 1) {
      await this.attachments.save(
        this.attachments.create({
          messageId: message.id,
          mediaObjectId: attachmentIds[i]!,
          sortOrder: i,
        }),
      );
    }

    await this.members.update(
      { chatId: input.chatId, userId: input.authorId },
      { lastReadAt: message.createdAt, lastReadMessageId: message.id },
    );

    return message;
  }

  async markRead(
    chatId: string,
    userId: string,
    messageId?: string,
  ): Promise<void> {
    await this.getChatForMember(chatId, userId);
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
    await this.members.update(
      { chatId, userId },
      { lastReadAt: readAt, lastReadMessageId: readMessageId },
    );
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

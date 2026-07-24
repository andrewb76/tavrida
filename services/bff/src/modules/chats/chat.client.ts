import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { internalServiceHeaders } from '@tavrida/internal-auth';

export type ChatKind = 'DIRECT' | 'GROUP' | 'TOPIC';

export type ChatDto = {
  id: string;
  kind: ChatKind;
  self: boolean;
  title: string | null;
  contextType: string | null;
  contextId: string | null;
  peerUserId?: string | null;
  directKey?: string | null;
  createdAt?: string;
};

export type ChatPeerDto = {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export type ChatListItemDto = {
  id: string;
  kind: ChatKind;
  self: boolean;
  title: string | null;
  contextType: string | null;
  contextId: string | null;
  peerUserId?: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview?: string | null;
  lastMessageAuthorId?: string | null;
};

export type MessageDeliveryStatus = 'DELIVERED' | 'READ';

export type MessageAuthorDto = {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export type MessageDto = {
  id: string;
  chatId: string;
  authorId: string;
  /** BFF enrich from user-profile (GROUP/TOPIC UI). */
  author?: MessageAuthorDto | null;
  body: string;
  mentions: Array<{
    userId: string;
    username: string;
    offset: number;
    length: number;
  }>;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  status?: MessageDeliveryStatus | null;
  replyToMessageId?: string | null;
  replyTo?: {
    id: string;
    authorId: string;
    body: string;
    deleted: boolean;
    authorDisplayName?: string | null;
  } | null;
  attachments?: Array<
    | { mediaObjectId: string; sortOrder: number }
    | {
        id: string;
        url: string;
        filename: string;
        contentType: string;
        sizeBytes: number;
      }
  >;
};

const DEFAULT_TIMEOUT_MS = 5000;

@Injectable()
export class ChatClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return (this.config.get<string>('CHAT_URL') ?? 'http://localhost:3016').replace(
      /\/$/,
      '',
    );
  }

  private headers(hasBody: boolean): Record<string, string> {
    return internalServiceHeaders(
      this.config.get<string>('INTERNAL_SERVICE_TOKEN'),
      hasBody ? { 'Content-Type': 'application/json' } : {},
    );
  }

  list(userId: string, kind?: ChatKind, opts?: { hidden?: boolean }) {
    const params = new URLSearchParams({ userId });
    if (kind) params.set('kind', kind);
    if (opts?.hidden) params.set('hidden', '1');
    return this.request<ChatListItemDto[]>('GET', `/internal/v1/chats?${params}`);
  }

  unread(userId: string) {
    const params = new URLSearchParams({ userId });
    return this.request<{ chatsWithUnread: number; totalUnreadMessages: number }>(
      'GET',
      `/internal/v1/chats/unread?${params}`,
    );
  }

  ensureDirect(userId: string, peerUserId: string) {
    return this.request<ChatDto>('POST', '/internal/v1/chats/direct/ensure', {
      userId,
      peerUserId,
    });
  }

  ensureSelf(userId: string) {
    return this.request<ChatDto>('POST', '/internal/v1/chats/self/ensure', { userId });
  }

  ensureTopic(topicId: string, authorId: string) {
    return this.request<ChatDto>('POST', '/internal/v1/chats/topic/ensure', {
      topicId,
      authorId,
    });
  }

  addTopicMember(topicId: string, userId: string) {
    return this.request<ChatDto>('POST', '/internal/v1/chats/topic/members/add', {
      topicId,
      userId,
    });
  }

  createGroup(input: { ownerId: string; title?: string; memberIds: string[] }) {
    return this.request<ChatDto>('POST', '/internal/v1/chats/groups', input);
  }

  spawnGroup(
    directChatId: string,
    input: {
      ownerId: string;
      title?: string;
      memberIds?: string[];
      copyCount: number;
    },
  ) {
    return this.request<ChatDto>(
      'POST',
      `/internal/v1/chats/${directChatId}/spawn-group`,
      input,
    );
  }

  inviteMembers(chatId: string, actorId: string, memberIds: string[]) {
    return this.request<ChatDto>('POST', `/internal/v1/chats/${chatId}/members`, {
      actorId,
      memberIds,
    });
  }

  leaveGroup(chatId: string, userId: string) {
    return this.request<void>('POST', `/internal/v1/chats/${chatId}/leave`, { userId });
  }

  countGroupMemberships(userId: string) {
    const params = new URLSearchParams({ userId });
    return this.request<{ count: number }>(
      'GET',
      `/internal/v1/chats/stats/group-memberships?${params}`,
    );
  }

  countGroupsCreatedToday(userId: string) {
    const params = new URLSearchParams({ userId });
    return this.request<{ count: number }>(
      'GET',
      `/internal/v1/chats/stats/groups-created-today?${params}`,
    );
  }

  countGroupMembers(chatId: string) {
    return this.request<{ count: number }>(
      'GET',
      `/internal/v1/chats/${chatId}/member-count`,
    );
  }

  get(chatId: string, userId: string) {
    const params = new URLSearchParams({ userId });
    return this.request<ChatDto>('GET', `/internal/v1/chats/${chatId}?${params}`);
  }

  listMessages(
    chatId: string,
    userId: string,
    opts?: { limit?: number; cursor?: string | null },
  ) {
    const params = new URLSearchParams({ userId });
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    if (opts?.cursor) params.set('cursor', opts.cursor);
    return this.request<{ data: MessageDto[]; nextCursor: string | null }>(
      'GET',
      `/internal/v1/chats/${chatId}/messages?${params}`,
    );
  }

  sendMessage(input: {
    chatId: string;
    authorId: string;
    body: string;
    mentions?: MessageDto['mentions'];
    attachmentIds?: string[];
    replyToMessageId?: string;
  }) {
    return this.request<MessageDto>(
      'POST',
      `/internal/v1/chats/${input.chatId}/messages`,
      {
        authorId: input.authorId,
        body: input.body,
        mentions: input.mentions,
        attachmentIds: input.attachmentIds,
        replyToMessageId: input.replyToMessageId,
      },
    );
  }

  editMessage(input: {
    chatId: string;
    messageId: string;
    authorId: string;
    body: string;
    mentions?: MessageDto['mentions'];
    editWindowMinutes: number;
  }) {
    return this.request<MessageDto>(
      'POST',
      `/internal/v1/chats/${input.chatId}/messages/${input.messageId}/edit`,
      {
        authorId: input.authorId,
        body: input.body,
        mentions: input.mentions,
        editWindowMinutes: input.editWindowMinutes,
      },
    );
  }

  deleteMessage(input: {
    chatId: string;
    messageId: string;
    authorId: string;
    deleteWindowMinutes: number;
  }) {
    return this.request<MessageDto>(
      'POST',
      `/internal/v1/chats/${input.chatId}/messages/${input.messageId}/delete`,
      {
        authorId: input.authorId,
        deleteWindowMinutes: input.deleteWindowMinutes,
      },
    );
  }

  hide(chatId: string, userId: string) {
    return this.request<void>('POST', `/internal/v1/chats/${chatId}/hide`, { userId });
  }

  unhide(chatId: string, userId: string) {
    return this.request<void>('POST', `/internal/v1/chats/${chatId}/unhide`, { userId });
  }

  markRead(chatId: string, userId: string, messageId?: string) {
    return this.request<void>('POST', `/internal/v1/chats/${chatId}/read`, {
      userId,
      messageId,
    });
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl()}${path}`, {
        method,
        headers: this.headers(body !== undefined),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException('chat unavailable');
    }

    if (!res.ok) {
      let payload: Record<string, unknown> = {};
      try {
        payload = (await res.json()) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
      const message =
        (typeof payload['message'] === 'string' && payload['message']) ||
        (typeof payload['detail'] === 'string' && payload['detail']) ||
        res.statusText;
      if (res.status === 404) throw new NotFoundException(message);
      if (res.status === 403) throw new ForbiddenException(message);
      if (res.status === 409) {
        throw new HttpException(message, 409);
      }
      throw new HttpException(message, res.status);
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

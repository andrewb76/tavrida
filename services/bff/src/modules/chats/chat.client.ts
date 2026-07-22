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
  directKey?: string | null;
  createdAt?: string;
};

export type ChatListItemDto = {
  id: string;
  kind: ChatKind;
  self: boolean;
  title: string | null;
  contextType: string | null;
  contextId: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
};

export type MessageDto = {
  id: string;
  chatId: string;
  authorId: string;
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

  list(userId: string, kind?: ChatKind) {
    const params = new URLSearchParams({ userId });
    if (kind) params.set('kind', kind);
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

  get(chatId: string, userId: string) {
    const params = new URLSearchParams({ userId });
    return this.request<ChatDto>('GET', `/internal/v1/chats/${chatId}?${params}`);
  }

  listMessages(chatId: string, userId: string, limit?: number) {
    const params = new URLSearchParams({ userId });
    if (limit != null) params.set('limit', String(limit));
    return this.request<MessageDto[]>(
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
  }) {
    return this.request<MessageDto>(
      'POST',
      `/internal/v1/chats/${input.chatId}/messages`,
      {
        authorId: input.authorId,
        body: input.body,
        mentions: input.mentions,
        attachmentIds: input.attachmentIds,
      },
    );
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
      throw new HttpException(message, res.status);
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

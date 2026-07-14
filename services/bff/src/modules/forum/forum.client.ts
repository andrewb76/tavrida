import {
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ForumClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url = this.config.get<string>('FORUM_URL') ?? 'http://localhost:3009';
    return url.replace(/\/$/, '');
  }

  listCategories() {
    return this.request<{ data: unknown[] }>('GET', '/internal/v1/categories');
  }

  createCategory(input: {
    slug: string;
    title: string;
    description?: string;
    parentId?: string | null;
    sortOrder?: number;
  }) {
    return this.request<Record<string, unknown>>('POST', '/internal/v1/categories', input);
  }

  updateCategory(
    categoryId: string,
    input: {
      slug?: string;
      title?: string;
      description?: string;
      parentId?: string | null;
      sortOrder?: number;
    },
  ) {
    return this.request<Record<string, unknown>>(
      'PATCH',
      `/internal/v1/categories/${categoryId}`,
      input,
    );
  }

  deleteCategory(categoryId: string) {
    return this.request<{ ok: boolean }>('DELETE', `/internal/v1/categories/${categoryId}`);
  }

  listTopics(query: { categoryId?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (query.categoryId) params.set('categoryId', query.categoryId);
    if (query.limit != null) params.set('limit', String(query.limit));
    const suffix = params.size ? `?${params.toString()}` : '';
    return this.request<{ data: unknown[] }>('GET', `/internal/v1/topics${suffix}`);
  }

  getTopic(topicId: string, viewer?: { userId?: string; changeWindowMinutes?: number }) {
    const params = new URLSearchParams();
    if (viewer?.userId) params.set('viewerId', viewer.userId);
    if (viewer?.changeWindowMinutes != null) {
      params.set('changeWindowMinutes', String(viewer.changeWindowMinutes));
    }
    const q = params.size ? `?${params}` : '';
    return this.request<Record<string, unknown>>('GET', `/internal/v1/topics/${topicId}${q}`);
  }

  createTopic(input: {
    categoryId: string;
    authorId: string;
    title: string;
    body: string;
    attachments?: Array<{
      url: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
    }>;
    maxAttachmentCount?: number;
    maxAttachmentSizeBytes?: number;
  }) {
    return this.request<Record<string, unknown>>('POST', '/internal/v1/topics', input);
  }

  updateTopic(
    topicId: string,
    input: {
      authorId: string;
      title?: string;
      body?: string;
      attachments?: Array<{
        url: string;
        filename: string;
        contentType: string;
        sizeBytes: number;
      }>;
      editWindowMinutes: number;
      maxAttachmentCount?: number;
      maxAttachmentSizeBytes?: number;
    },
  ) {
    return this.request<Record<string, unknown>>('PATCH', `/internal/v1/topics/${topicId}`, input);
  }

  listComments(
    topicId: string,
    viewer?: { userId?: string; changeWindowMinutes?: number },
  ) {
    const params = new URLSearchParams();
    if (viewer?.userId) params.set('viewerId', viewer.userId);
    if (viewer?.changeWindowMinutes != null) {
      params.set('changeWindowMinutes', String(viewer.changeWindowMinutes));
    }
    const q = params.size ? `?${params}` : '';
    return this.request<{ data: unknown[] }>(
      'GET',
      `/internal/v1/topics/${topicId}/comments${q}`,
    );
  }

  createComment(
    topicId: string,
    input: {
      authorId: string;
      body: string;
      parentId?: string;
      attachments?: Array<{
        url: string;
        filename: string;
        contentType: string;
        sizeBytes: number;
      }>;
      maxAttachmentCount?: number;
      maxAttachmentSizeBytes?: number;
    },
  ) {
    return this.request<Record<string, unknown>>(
      'POST',
      `/internal/v1/topics/${topicId}/comments`,
      input,
    );
  }

  updateComment(
    topicId: string,
    commentId: string,
    input: {
      authorId: string;
      body?: string;
      attachments?: Array<{
        url: string;
        filename: string;
        contentType: string;
        sizeBytes: number;
      }>;
      editWindowMinutes: number;
      maxAttachmentCount?: number;
      maxAttachmentSizeBytes?: number;
    },
  ) {
    return this.request<Record<string, unknown>>(
      'PATCH',
      `/internal/v1/topics/${topicId}/comments/${commentId}`,
      input,
    );
  }

  listReactions(contentId: string, contentType: 'topic' | 'comment') {
    const params = new URLSearchParams({ contentId, contentType });
    return this.request<Record<string, unknown>>('GET', `/internal/v1/reactions?${params}`);
  }

  upsertReaction(input: {
    contentId: string;
    contentType: 'topic' | 'comment';
    userId: string;
    emojiKey: string;
    allowPaid?: boolean;
  }) {
    return this.request<Record<string, unknown>>('POST', '/internal/v1/reactions', input);
  }

  castVote(input: {
    contentId: string;
    contentType: 'topic' | 'comment';
    userId: string;
    value: 1 | -1;
    changeWindowMinutes: number;
  }) {
    return this.request<Record<string, unknown>>('POST', '/internal/v1/votes', input);
  }

  clearVote(input: {
    contentId: string;
    contentType: 'topic' | 'comment';
    userId: string;
    changeWindowMinutes: number;
  }) {
    return this.request<Record<string, unknown>>('POST', '/internal/v1/votes/clear', input);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl()}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ServiceUnavailableException({
        type: 'upstream_unavailable',
        detail: 'forum service is unavailable',
      });
    }

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as T & { message?: string | string[] }) : ({} as T);

    if (response.ok) return payload;

    const detail =
      typeof payload === 'object' && payload && 'message' in payload
        ? payload.message
        : text || response.statusText;

    if (response.status === 404) {
      throw new NotFoundException({ type: 'not-found', detail });
    }

    throw new HttpException({ type: 'upstream_error', detail }, response.status);
  }
}

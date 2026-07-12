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

  getTopic(topicId: string) {
    return this.request<Record<string, unknown>>('GET', `/internal/v1/topics/${topicId}`);
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

  listComments(topicId: string) {
    return this.request<{ data: unknown[] }>('GET', `/internal/v1/topics/${topicId}/comments`);
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

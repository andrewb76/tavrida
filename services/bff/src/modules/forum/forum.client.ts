import {
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { internalServiceHeaders } from '@tavrida/internal-auth';

@Injectable()
export class ForumClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url = this.config.get<string>('FORUM_URL') ?? 'http://localhost:3009';
    return url.replace(/\/$/, '');
  }

  listCategories(opts?: {
    viewerId?: string;
    isAdmin?: boolean;
    includeAccessGroups?: boolean;
  }) {
    const params = new URLSearchParams();
    if (opts?.viewerId) params.set('viewerId', opts.viewerId);
    if (opts?.isAdmin) params.set('isAdmin', '1');
    if (opts?.includeAccessGroups) params.set('includeAccessGroups', '1');
    const q = params.size ? `?${params}` : '';
    return this.request<{ data: unknown[] }>('GET', `/internal/v1/categories${q}`);
  }

  listAccessGroups() {
    return this.request<{ data: unknown[] }>('GET', '/internal/v1/access-groups');
  }

  membershipsByUsers(userIds: string[]) {
    return this.request<{
      data: Record<string, Array<{ id: string; name: string }>>;
    }>('POST', '/internal/v1/access-groups/memberships/by-users', { userIds });
  }

  createAccessGroup(input: { name: string; description?: string }) {
    return this.request<Record<string, unknown>>('POST', '/internal/v1/access-groups', input);
  }

  updateAccessGroup(groupId: string, input: { name?: string; description?: string }) {
    return this.request<Record<string, unknown>>(
      'PATCH',
      `/internal/v1/access-groups/${groupId}`,
      input,
    );
  }

  deleteAccessGroup(groupId: string) {
    return this.request<{ ok: boolean }>('DELETE', `/internal/v1/access-groups/${groupId}`);
  }

  getAccessGroupMembers(groupId: string) {
    return this.request<{ groupId: string; userIds: string[] }>(
      'GET',
      `/internal/v1/access-groups/${groupId}/members`,
    );
  }

  setAccessGroupMembers(groupId: string, userIds: string[]) {
    return this.request<{ groupId: string; userIds: string[] }>(
      'PUT',
      `/internal/v1/access-groups/${groupId}/members`,
      { userIds },
    );
  }

  getCategoryAccessGroups(categoryId: string) {
    return this.request<{ categoryId: string; groupIds: string[] }>(
      'GET',
      `/internal/v1/categories/${categoryId}/access-groups`,
    );
  }

  setCategoryAccessGroups(categoryId: string, groupIds: string[]) {
    return this.request<{ categoryId: string; groupIds: string[] }>(
      'PUT',
      `/internal/v1/categories/${categoryId}/access-groups`,
      { groupIds },
    );
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

  listTopics(query: {
    categoryId?: string;
    limit?: number;
    status?: 'DRAFT' | 'PUBLISHED';
    authorId?: string;
    viewerId?: string;
    isAdmin?: boolean;
  }) {
    const params = new URLSearchParams();
    if (query.categoryId) params.set('categoryId', query.categoryId);
    if (query.limit != null) params.set('limit', String(query.limit));
    if (query.status) params.set('status', query.status);
    if (query.authorId) params.set('authorId', query.authorId);
    if (query.viewerId) params.set('viewerId', query.viewerId);
    if (query.isAdmin) params.set('isAdmin', '1');
    const suffix = params.size ? `?${params.toString()}` : '';
    return this.request<{ data: unknown[] }>('GET', `/internal/v1/topics${suffix}`);
  }

  getTopic(
    topicId: string,
    viewer?: { userId?: string; changeWindowMinutes?: number; isAdmin?: boolean },
  ) {
    const params = new URLSearchParams();
    if (viewer?.userId) params.set('viewerId', viewer.userId);
    if (viewer?.changeWindowMinutes != null) {
      params.set('changeWindowMinutes', String(viewer.changeWindowMinutes));
    }
    if (viewer?.isAdmin) params.set('isAdmin', '1');
    const q = params.size ? `?${params}` : '';
    return this.request<Record<string, unknown>>('GET', `/internal/v1/topics/${topicId}${q}`);
  }

  createTopic(input: {
    categoryId: string;
    authorId: string;
    title: string;
    body: string;
    status?: 'DRAFT' | 'PUBLISHED';
    attachments?: Array<{
      url: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
    }>;
    maxAttachmentCount?: number;
    maxAttachmentSizeBytes?: number;
    isAdmin?: boolean;
  }) {
    return this.request<Record<string, unknown>>('POST', '/internal/v1/topics', input);
  }

  updateTopic(
    topicId: string,
    input: {
      authorId: string;
      title?: string;
      body?: string;
      status?: 'DRAFT' | 'PUBLISHED';
      attachments?: Array<{
        url: string;
        filename: string;
        contentType: string;
        sizeBytes: number;
      }>;
      editWindowMinutes: number;
      maxAttachmentCount?: number;
      maxAttachmentSizeBytes?: number;
      asModerator?: boolean;
    },
  ) {
    return this.request<Record<string, unknown>>('PATCH', `/internal/v1/topics/${topicId}`, input);
  }

  deleteTopic(topicId: string, input: { actorId: string; asModerator?: boolean }) {
    return this.request<{ ok: boolean }>('DELETE', `/internal/v1/topics/${topicId}`, input);
  }

  listComments(
    topicId: string,
    viewer?: { userId?: string; changeWindowMinutes?: number; isAdmin?: boolean },
  ) {
    const params = new URLSearchParams();
    if (viewer?.userId) params.set('viewerId', viewer.userId);
    if (viewer?.changeWindowMinutes != null) {
      params.set('changeWindowMinutes', String(viewer.changeWindowMinutes));
    }
    if (viewer?.isAdmin) params.set('isAdmin', '1');
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
      isAdmin?: boolean;
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
      asModerator?: boolean;
    },
  ) {
    return this.request<Record<string, unknown>>(
      'PATCH',
      `/internal/v1/topics/${topicId}/comments/${commentId}`,
      input,
    );
  }

  deleteComment(
    topicId: string,
    commentId: string,
    input: { actorId: string; asModerator?: boolean },
  ) {
    return this.request<{ ok: boolean }>(
      'DELETE',
      `/internal/v1/topics/${topicId}/comments/${commentId}`,
      input,
    );
  }

  promoteCommentToTopic(
    topicId: string,
    commentId: string,
    input: { actorId: string; title?: string; asModerator?: boolean },
  ) {
    return this.request<Record<string, unknown>>(
      'POST',
      `/internal/v1/topics/${topicId}/comments/${commentId}/promote-to-topic`,
      input,
    );
  }

  updateTopicTags(
    topicId: string,
    input: { authorId: string; tags: string[]; asModerator?: boolean },
  ) {
    return this.request<Record<string, unknown>>(
      'PUT',
      `/internal/v1/topics/${topicId}/tags`,
      input,
    );
  }

  listTags(q?: string, limit?: number) {
    const params = new URLSearchParams();
    if (q?.trim()) params.set('q', q.trim());
    if (limit != null) params.set('limit', String(limit));
    const qs = params.toString();
    return this.request<{ data: unknown[] }>('GET', `/internal/v1/tags${qs ? `?${qs}` : ''}`);
  }

  getTagBySlug(slug: string) {
    return this.request<Record<string, unknown>>(
      'GET',
      `/internal/v1/tags/${encodeURIComponent(slug)}`,
    );
  }

  getTagsByIds(ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
    if (!unique.length) return Promise.resolve({ data: [] as unknown[] });
    const params = new URLSearchParams({ ids: unique.join(',') });
    return this.request<{ data: unknown[] }>('GET', `/internal/v1/tags/by-ids?${params}`);
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
        headers: internalServiceHeaders(
          this.config.get<string>('INTERNAL_SERVICE_TOKEN'),
          body ? { 'Content-Type': 'application/json' } : {},
        ),
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

import {
  ConflictException,
  GoneException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type InternalInviteRecord = {
  id: string;
  code: string;
  email?: string;
  usesCount: number;
  maxUses: number;
  expiresAt: string;
  createdAt: string;
  status: 'active' | 'redeemed' | 'expired';
};

export type ResolvedInvite = {
  token: string;
  email?: string;
  inviterId: string;
  inviteCodeId: string;
  code: string;
};

@Injectable()
export class UserProfileClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url = this.config.get<string>('USER_PROFILE_URL') ?? 'http://localhost:3007';
    return url.replace(/\/$/, '');
  }

  async createInvite(body: {
    issuerId: string;
    logtoToken: string;
    email?: string;
    expiresAt: string;
    maxUses?: number;
  }) {
    return this.request<{
      id: string;
      code: string;
      email?: string;
      expiresAt: string;
      createdAt: string;
    }>('POST', '/internal/v1/invites', body);
  }

  async listInvites(issuerId: string, limit = 20) {
    const qs = new URLSearchParams({ issuerId, limit: String(limit) });
    const res = await this.request<{ data: InternalInviteRecord[] }>(
      'GET',
      `/internal/v1/invites?${qs}`,
    );
    return res.data;
  }

  async resolveInvite(params: { code?: string; token?: string }) {
    const qs = new URLSearchParams();
    if (params.code) qs.set('code', params.code);
    if (params.token) qs.set('token', params.token);
    return this.request<ResolvedInvite>('GET', `/internal/v1/invites/resolve?${qs}`);
  }

  async claimInvite(body: {
    userId: string;
    inviteCodeId?: string;
    inviterId?: string;
  }) {
    return this.request<{
      userId: string;
      inviterId: string;
      invitationAcceptedAt: string | null;
      claimed: boolean;
    }>('POST', '/internal/v1/invites/claim', body);
  }

  async listUsers(params: { offset?: number; limit?: number; q?: string }) {
    const qs = new URLSearchParams();
    if (params.offset != null) qs.set('offset', String(params.offset));
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.q) qs.set('q', params.q);
    const suffix = qs.size ? `?${qs.toString()}` : '';
    return this.request<{
      data: Array<{
        userId: string;
        displayName: string | null;
        email: string | null;
        username: string | null;
        avatarUrl: string | null;
        primaryPhone: string | null;
        isSuspended: boolean;
        inviterId: string | null;
        invitationAcceptedAt: string | null;
        deletedAt: string | null;
        logtoSyncedAt: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
      pagination: { offset: number; limit: number; total: number };
    }>('GET', `/internal/v1/users${suffix}`);
  }

  async syncFromLogto(body: {
    userId: string;
    name?: string | null;
    username?: string | null;
    primaryEmail?: string | null;
    primaryPhone?: string | null;
    avatar?: string | null;
    isSuspended?: boolean;
  }) {
    return this.request<{ userId: string; synced: boolean }>('POST', '/internal/v1/users/sync-logto', body);
  }

  async markDeleted(userId: string) {
    return this.request<{ userId: string; deleted: boolean }>(
      'POST',
      `/internal/v1/users/${encodeURIComponent(userId)}/mark-deleted`,
    );
  }

  async ensureUser(userId: string) {
    return this.request<{ userId: string; ensured: boolean }>('POST', '/internal/v1/users/ensure', {
      userId,
    });
  }

  async lookupByIds(userIds: string[]) {
    if (!userIds.length) {
      return [];
    }
    const res = await this.request<{
      data: Array<{
        userId: string;
        displayName: string | null;
        avatarUrl: string | null;
      }>;
    }>('POST', '/internal/v1/users/lookup', { ids: userIds });
    return res.data;
  }

  async getPublicProfile(userId: string) {
    return this.request<{
      userId: string;
      displayName: string | null;
      username: string | null;
      avatarUrl: string | null;
      isSuspended: boolean;
      memberSince: string;
    }>('GET', `/internal/v1/users/${encodeURIComponent(userId)}/public`);
  }

  async getRatingStats(userId: string) {
    return this.request<{
      userId: string;
      totalRating: number;
      karma: number;
      referralKarma: number;
      referralRating: number;
      effectiveKarma: number;
      effectiveRating: number;
      verifiedSales: number;
      pendingSales: number;
      feedbackCoverage: number | null;
    }>('GET', `/internal/v1/ratings/${encodeURIComponent(userId)}`);
  }

  async adjustRating(
    userId: string,
    body: {
      karmaDelta?: number;
      ratingDelta?: number;
      actorId?: string;
      source?: string;
      note?: string;
      referenceId?: string;
    },
  ) {
    return this.request<{
      userId: string;
      totalRating: number;
      karma: number;
      referralKarma: number;
      referralRating: number;
      effectiveKarma: number;
      effectiveRating: number;
      verifiedSales: number;
      pendingSales: number;
      feedbackCoverage: number | null;
    }>('POST', `/internal/v1/ratings/${encodeURIComponent(userId)}/adjust`, body);
  }

  async getRatingLog(
    userId: string,
    query: { metric: 'karma' | 'rating'; limit?: number },
  ) {
    const params = new URLSearchParams({ metric: query.metric });
    if (query.limit != null) params.set('limit', String(query.limit));
    return this.request<{
      data: Array<{
        id: string;
        userId: string;
        metric: 'karma' | 'rating';
        delta: number;
        balanceAfter: number;
        source: string;
        actorId: string | null;
        referenceId: string | null;
        note: string | null;
        createdAt: string;
      }>;
    }>('GET', `/internal/v1/ratings/${encodeURIComponent(userId)}/log?${params}`);
  }

  async getProfileNote(ownerId: string, authorId: string) {
    const qs = new URLSearchParams({ ownerId, authorId });
    return this.request<{
      id: string;
      ownerId: string;
      authorId: string;
      text: string;
      createdAt: string;
      updatedAt: string;
    } | null>('GET', `/internal/v1/profile-notes?${qs}`);
  }

  async upsertProfileNote(input: { ownerId: string; authorId: string; text: string }) {
    return this.request<{
      id: string;
      ownerId: string;
      authorId: string;
      text: string;
      createdAt: string;
      updatedAt: string;
    }>('POST', '/internal/v1/profile-notes', input);
  }

  async deleteProfileNote(noteId: string, authorId: string) {
    const qs = new URLSearchParams({ authorId });
    return this.request<{ id: string; deleted: boolean }>(
      'DELETE',
      `/internal/v1/profile-notes/${encodeURIComponent(noteId)}?${qs}`,
    );
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl()}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let payload: Record<string, unknown> = {};
      try {
        payload = (await res.json()) as Record<string, unknown>;
      } catch {
        /* ignore */
      }

      const detail =
        (typeof payload.detail === 'string' ? payload.detail : undefined) ??
        (typeof payload.message === 'string'
          ? payload.message
          : Array.isArray(payload.message)
            ? payload.message.join(', ')
            : res.statusText);

      const body = {
        type: typeof payload.type === 'string' ? payload.type : 'upstream-error',
        detail: `user-profile ${method} ${path}: ${detail}`,
      };

      if (res.status === 404) throw new NotFoundException(body);
      if (res.status === 409) throw new ConflictException(body);
      if (res.status === 410) throw new GoneException(body);
      if (res.status >= 500) throw new ServiceUnavailableException(body);
      throw new HttpException(body, res.status);
    }

    return (await res.json()) as T;
  }
}

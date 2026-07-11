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

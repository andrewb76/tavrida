import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { internalServiceHeaders } from '@tavrida/internal-auth';
import type { ScalarVariableRegistration } from './bff-scalar-variables.registry';

export type ClubSettings = {
  'registration.inviteOnly'?: boolean;
  'invite.validityDays'?: number;
  'invite.codeType'?: 'SINGLE_USE' | 'MULTI_USE';
  'landing.publicSections'?: string[];
};

export type ForumSettings = {
  'edit.windowMinutes'?: number;
  'vote.changeWindowMinutes'?: number;
  'vote.karmaPlusWeight'?: number;
  'vote.karmaMinusWeight'?: number;
};

@Injectable()
export class ScalarConfigClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url = this.config.get<string>('SCALAR_CONFIG_URL') ?? 'http://localhost:3008';
    return url.replace(/\/$/, '');
  }

  async sync(input: { service: string; keys: ScalarVariableRegistration[] }) {
    return this.request<{ service: string; synced: number; stale: string[] }>(
      'POST',
      '/internal/v1/scalar-variables/sync',
      input,
    );
  }

  async listRegistry() {
    return this.request<{
      data: Array<{
        key: string;
        service: string;
        type: string;
        description: string | null;
        syncStatus: 'active' | 'stale';
        defaultValue: unknown;
        value: unknown;
      }>;
    }>('GET', '/internal/v1/scalar-variables/registry');
  }

  async deleteKey(key: string) {
    return this.request<{ key: string; deleted: boolean }>(
      'DELETE',
      `/internal/v1/scalar-variables/${encodeURIComponent(key)}`,
    );
  }

  async getClubSettings(): Promise<ClubSettings> {
    return this.request<ClubSettings>('GET', '/internal/v1/scalar-variables/club');
  }

  async patchClubSettings(patch: ClubSettings, updatedBy: string): Promise<ClubSettings> {
    return this.request<ClubSettings>('POST', '/internal/v1/scalar-variables/club', {
      ...patch,
      updatedBy,
    });
  }

  async getForumSettings(): Promise<ForumSettings> {
    return this.request<ForumSettings>('GET', '/internal/v1/scalar-variables/forum');
  }

  async patchForumSettings(patch: ForumSettings, updatedBy: string): Promise<ForumSettings> {
    return this.request<ForumSettings>('POST', '/internal/v1/scalar-variables/forum', {
      ...patch,
      updatedBy,
    });
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl()}${path}`, {
      method,
      headers: internalServiceHeaders(
        this.config.get<string>('INTERNAL_SERVICE_TOKEN'),
        body ? { 'Content-Type': 'application/json' } : {},
      ),
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
        res.statusText;

      const errBody = {
        type: typeof payload.type === 'string' ? payload.type : 'upstream-error',
        detail: `scalar-config ${method} ${path}: ${detail}`,
      };

      if (res.status >= 500) throw new ServiceUnavailableException(errBody);
      throw new HttpException(errBody, res.status);
    }

    return (await res.json()) as T;
  }
}

import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SettingKeyRegistration } from './bff-settings.registry';

export type ClubSettings = {
  'registration.inviteOnly'?: boolean;
  'invite.validityDays'?: number;
  'invite.codeType'?: 'SINGLE_USE' | 'MULTI_USE';
  'landing.publicSections'?: string[];
};

@Injectable()
export class SettingsClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url = this.config.get<string>('SETTINGS_URL') ?? 'http://localhost:3008';
    return url.replace(/\/$/, '');
  }

  async register(keys: SettingKeyRegistration[]) {
    return this.request<{ registered: number }>('POST', '/internal/v1/settings/register', {
      keys,
    });
  }

  async getClubSettings(): Promise<ClubSettings> {
    return this.request<ClubSettings>('GET', '/internal/v1/settings/club');
  }

  async patchClubSettings(patch: ClubSettings, updatedBy: string): Promise<ClubSettings> {
    return this.request<ClubSettings>('POST', '/internal/v1/settings/club', {
      ...patch,
      updatedBy,
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
        res.statusText;

      const errBody = {
        type: typeof payload.type === 'string' ? payload.type : 'upstream-error',
        detail: `settings ${method} ${path}: ${detail}`,
      };

      if (res.status >= 500) throw new ServiceUnavailableException(errBody);
      throw new HttpException(errBody, res.status);
    }

    return (await res.json()) as T;
  }
}

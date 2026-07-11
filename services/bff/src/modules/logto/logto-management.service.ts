import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';

type OneTimeTokenResponse = {
  token: string;
  expiresAt: string;
};

type LogtoOneTimeTokenPayload = {
  token: string;
  expiresAt?: number | string;
};

function normalizeExpiresAt(
  expiresAt: number | string | undefined,
  expiresInSeconds: number,
): string {
  if (typeof expiresAt === 'number' && Number.isFinite(expiresAt)) {
    const ms = expiresAt > 1e12 ? expiresAt : expiresAt * 1000;
    return new Date(ms).toISOString();
  }

  if (typeof expiresAt === 'string' && expiresAt.trim()) {
    const parsed = new Date(expiresAt);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

type CachedM2MToken = {
  accessToken: string;
  expiresAt: number;
};

type LogtoUserRow = {
  id: string;
  username: string | null;
  primaryEmail: string | null;
  name: string | null;
  avatar: string | null;
  createdAt: number;
};

@Injectable()
export class LogtoManagementService {
  private cached: CachedM2MToken | null = null;

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('LOGTO_M2M_APP_ID') &&
        this.config.get<string>('LOGTO_M2M_APP_SECRET') &&
        this.config.get<string>('LOGTO_ENDPOINT'),
    );
  }

  async createOneTimeToken(options: {
    email: string;
    expiresIn: number;
  }): Promise<OneTimeTokenResponse> {
    if (!this.isConfigured) {
      const expiresAt = new Date(Date.now() + options.expiresIn * 1000).toISOString();
      return {
        token: `dev-${randomBytes(24).toString('base64url')}`,
        expiresAt,
      };
    }

    const endpoint = this.config.get<string>('LOGTO_ENDPOINT')!.replace(/\/$/, '');
    const accessToken = await this.getM2MToken();

    const body = { email: options.email, expiresIn: options.expiresIn };

    const res = await fetch(`${endpoint}/api/one-time-tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new ServiceUnavailableException({
        type: 'upstream-error',
        detail: `Logto one-time token failed: ${res.status} ${detail}`,
      });
    }

    const json = (await res.json()) as LogtoOneTimeTokenPayload;
    return {
      token: json.token,
      expiresAt: normalizeExpiresAt(json.expiresAt, options.expiresIn),
    };
  }

  private m2mResource(): string {
    const endpoint = this.config.get<string>('LOGTO_ENDPOINT')!.replace(/\/$/, '');
    const configured = this.config.get<string>('LOGTO_M2M_RESOURCE')?.trim();

    // OSS default — only valid for self-hosted Logto
    const ossDefault = 'https://default.logto.app/api';
    if (configured && configured !== ossDefault) {
      return configured;
    }

    // Logto Cloud: Management API indicator is https://{tenant}.logto.app/api
    if (endpoint.includes('.logto.app')) {
      return `${endpoint}/api`;
    }

    return configured ?? ossDefault;
  }

  private async getM2MToken(): Promise<string> {
    if (this.cached && this.cached.expiresAt > Date.now() + 60_000) {
      return this.cached.accessToken;
    }

    const endpoint = this.config.get<string>('LOGTO_ENDPOINT')!.replace(/\/$/, '');
    const clientId = this.config.get<string>('LOGTO_M2M_APP_ID')!;
    const clientSecret = this.config.get<string>('LOGTO_M2M_APP_SECRET')!;
    const resource = this.m2mResource();

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      resource,
      scope: 'all',
    });

    const res = await fetch(`${endpoint}/oidc/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new ServiceUnavailableException({
        type: 'upstream-error',
        detail: `Logto M2M token failed: ${res.status} ${detail}`,
      });
    }

    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.cached = {
      accessToken: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    return json.access_token;
  }

  async listUsers(options?: { page?: number; pageSize?: number; search?: string }) {
    if (!this.isConfigured) return [];

    const endpoint = this.config.get<string>('LOGTO_ENDPOINT')!.replace(/\/$/, '');
    const accessToken = await this.getM2MToken();
    const qs = new URLSearchParams({
      page: String(options?.page ?? 1),
      page_size: String(options?.pageSize ?? 100),
    });
    if (options?.search?.trim()) {
      qs.set('search', `%${options.search.trim()}%`);
    }

    const res = await fetch(`${endpoint}/api/users?${qs}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new ServiceUnavailableException({
        type: 'upstream-error',
        detail: `Logto list users failed: ${res.status} ${detail}`,
      });
    }

    return (await res.json()) as LogtoUserRow[];
  }
}

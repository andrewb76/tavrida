import { HttpException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { internalServiceHeaders } from '@tavrida/internal-auth';

const DEFAULT_TIMEOUT_MS = 3000;

export type PresenceStatus = 'online' | 'away' | 'offline';

export type PresenceResult = {
  user_id: string;
  status: PresenceStatus;
  last_seen: string | null;
};

@Injectable()
export class PresenceClient {
  private readonly logger = new Logger(PresenceClient.name);

  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return (this.config.get<string>('PRESENCE_URL') ?? 'http://localhost:3017').replace(
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

  async heartbeat(
    userId: string,
    visibility: 'visible' | 'hidden' = 'visible',
    lastActivityAt?: string,
  ): Promise<void> {
    try {
      await this.request<void>('POST', '/internal/v1/presence/heartbeat', {
        user_id: userId,
        visibility,
        last_activity_at: lastActivityAt,
      });
    } catch (err) {
      this.logger.debug(`heartbeat failed for ${userId}: ${String(err)}`);
    }
  }

  async getStatus(userId: string): Promise<PresenceResult> {
    return this.request<PresenceResult>('GET', `/internal/v1/presence/${userId}`);
  }

  async batch(userIds: string[]): Promise<PresenceResult[]> {
    if (userIds.length === 0) return [];
    const { presences } = await this.request<{ presences: PresenceResult[] }>(
      'POST',
      '/internal/v1/presence/batch',
      { user_ids: userIds },
    );
    return presences;
  }

  async setVisibility(
    userId: string,
    visibility: 'visible' | 'hidden',
  ): Promise<void> {
    try {
      await this.request<void>('POST', '/internal/v1/presence/visibility', {
        user_id: userId,
        visibility,
      });
    } catch (err) {
      this.logger.debug(`setVisibility failed for ${userId}: ${String(err)}`);
    }
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
      throw new ServiceUnavailableException('presence unavailable');
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
      throw new HttpException(message, res.status);
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

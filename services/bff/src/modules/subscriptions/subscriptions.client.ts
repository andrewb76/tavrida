import {
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SubscriptionDto = {
  id: string;
  userId: string;
  sourceDomain: string;
  targetType: string;
  targetId: string | null;
  options: Record<string, unknown>;
  createdAt: string;
};

export type DeliveryPreferenceDto = {
  userId: string;
  emailDigestEnabled: boolean;
  pushEnabled: boolean;
  digestFrequency: 'DAILY' | 'WEEKLY';
  quietHours: { start: string; end: string; tz: string } | null;
  updatedAt: string | null;
};

const DEFAULT_TIMEOUT_MS = 2000;

@Injectable()
export class SubscriptionsClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url =
      this.config.get<string>('SUBSCRIPTIONS_URL') ??
      this.config.get<string>('AUCTION_SUBSCRIPTIONS_URL') ??
      'http://localhost:3004';
    return url.replace(/\/$/, '');
  }

  private headers(hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = {};
    if (hasBody) headers['Content-Type'] = 'application/json';
    const token = this.config.get<string>('INTERNAL_SERVICE_TOKEN')?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  list(userId: string, sourceDomain?: string) {
    const params = new URLSearchParams({ userId });
    if (sourceDomain) params.set('sourceDomain', sourceDomain);
    return this.request<{ data: SubscriptionDto[] }>(
      'GET',
      `/internal/v1/subscriptions?${params}`,
    );
  }

  count(userId: string, targetType: string) {
    const params = new URLSearchParams({ userId, targetType });
    return this.request<{ count: number; limitKey: string | null }>(
      'GET',
      `/internal/v1/subscriptions/count?${params}`,
    );
  }

  create(input: {
    userId: string;
    sourceDomain: string;
    targetType: string;
    targetId?: string | null;
    options?: Record<string, unknown>;
  }) {
    return this.request<SubscriptionDto>('POST', '/internal/v1/subscriptions', input);
  }

  remove(userId: string, id: string) {
    const params = new URLSearchParams({ userId });
    return this.request<{ ok: true }>('DELETE', `/internal/v1/subscriptions/${id}?${params}`);
  }

  getDelivery(userId: string) {
    const params = new URLSearchParams({ userId });
    return this.request<DeliveryPreferenceDto>(
      'GET',
      `/internal/v1/subscriptions/delivery?${params}`,
    );
  }

  updateDelivery(input: {
    userId: string;
    emailDigestEnabled?: boolean;
    pushEnabled?: boolean;
    digestFrequency?: 'DAILY' | 'WEEKLY';
    quietHours?: { start: string; end: string; tz: string } | null;
  }) {
    return this.request<DeliveryPreferenceDto>(
      'PATCH',
      '/internal/v1/subscriptions/delivery',
      input,
    );
  }

  /** Resolve subscribers for a domain event (`tag.content_tagged`, …). */
  match(eventType: string, payload: Record<string, unknown>) {
    return this.request<{ userIds: string[] }>('POST', '/internal/v1/subscriptions/match', {
      eventType,
      payload,
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
      throw new ServiceUnavailableException('subscriptions unavailable');
    }

    if (!res.ok) {
      let payload: Record<string, unknown> = {};
      try {
        payload = (await res.json()) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
      if (res.status === 404) {
        throw new NotFoundException(payload['message'] ?? 'Not found');
      }
      throw new HttpException(payload['message'] ?? res.statusText, res.status);
    }

    return (await res.json()) as T;
  }
}

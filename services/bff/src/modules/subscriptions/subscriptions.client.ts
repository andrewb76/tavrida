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

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl()}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
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

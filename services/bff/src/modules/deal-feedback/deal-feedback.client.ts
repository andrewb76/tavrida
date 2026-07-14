import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DealFeedbackClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return (
      this.config.get<string>('DEAL_FEEDBACK_URL') ??
      this.config.get<string>('FEEDBACK_URL') ??
      'http://localhost:3006'
    ).replace(/\/$/, '');
  }

  listPending(userId: string) {
    const qs = new URLSearchParams({ userId });
    return this.request<{ data: unknown[] }>(
      'GET',
      `/internal/v1/deal-feedback/pending?${qs}`,
    );
  }

  getStatus(input: {
    userId: string;
    dealType: 'auction' | 'marketplace';
    auctionId?: string;
    orderId?: string;
  }) {
    const qs = new URLSearchParams({
      userId: input.userId,
      dealType: input.dealType,
    });
    if (input.auctionId) qs.set('auctionId', input.auctionId);
    if (input.orderId) qs.set('orderId', input.orderId);
    return this.request<unknown>('GET', `/internal/v1/deal-feedback/status?${qs}`);
  }

  submit(body: unknown) {
    return this.request<unknown>('POST', '/internal/v1/deal-feedback/submit', body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl()}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new ServiceUnavailableException(`deal-feedback unavailable: ${String(err)}`);
    }

    if (!res.ok) {
      const payload = await res.json().catch(() => ({ message: res.statusText }));
      throw new HttpException(payload, res.status);
    }
    return (await res.json()) as T;
  }
}

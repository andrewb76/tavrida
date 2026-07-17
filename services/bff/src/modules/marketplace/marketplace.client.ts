import {
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { internalServiceHeaders } from '@tavrida/internal-auth';

@Injectable()
export class MarketplaceClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return (this.config.get<string>('MARKETPLACE_URL') ?? 'http://localhost:3011').replace(
      /\/$/,
      '',
    );
  }

  listListings(query: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') params.set(k, v);
    }
    const qs = params.toString();
    return this.request<{ data: unknown[] }>(
      'GET',
      `/internal/v1/marketplace/listings${qs ? `?${qs}` : ''}`,
    );
  }

  getListing(id: string, viewerId?: string) {
    const qs = viewerId ? `?viewerId=${encodeURIComponent(viewerId)}` : '';
    return this.request<unknown>('GET', `/internal/v1/marketplace/listings/${id}${qs}`);
  }

  createListing(body: unknown) {
    return this.request<unknown>('POST', '/internal/v1/marketplace/listings', body);
  }

  updateListing(id: string, body: unknown) {
    return this.request<unknown>('PATCH', `/internal/v1/marketplace/listings/${id}`, body);
  }

  removeListing(id: string, providerId: string) {
    const qs = new URLSearchParams({ providerId });
    return this.request<{ ok: true }>(
      'DELETE',
      `/internal/v1/marketplace/listings/${id}?${qs}`,
    );
  }

  countActive(providerId: string) {
    const qs = new URLSearchParams({ providerId });
    return this.request<{ count: number }>(
      'GET',
      `/internal/v1/marketplace/listings/count-active?${qs}`,
    );
  }

  countPortfolio(listingId: string) {
    return this.request<{ count: number }>(
      'GET',
      `/internal/v1/marketplace/listings/${listingId}/portfolio/count`,
    );
  }

  addPortfolio(listingId: string, body: unknown) {
    return this.request<unknown>(
      'POST',
      `/internal/v1/marketplace/listings/${listingId}/portfolio`,
      body,
    );
  }

  removePortfolio(listingId: string, itemId: string, providerId: string) {
    const qs = new URLSearchParams({ providerId });
    return this.request<{ ok: true }>(
      'DELETE',
      `/internal/v1/marketplace/listings/${listingId}/portfolio/${itemId}?${qs}`,
    );
  }

  countOrdersMonthly(customerId: string) {
    const qs = new URLSearchParams({ customerId });
    return this.request<{ count: number }>(
      'GET',
      `/internal/v1/marketplace/orders/count-monthly?${qs}`,
    );
  }

  listOrders(userId: string, role: 'provider' | 'customer') {
    const qs = new URLSearchParams({ userId, role });
    return this.request<{ data: unknown[] }>('GET', `/internal/v1/marketplace/orders?${qs}`);
  }

  createOrder(body: unknown) {
    return this.request<unknown>('POST', '/internal/v1/marketplace/orders', body);
  }

  updateOrderStatus(id: string, body: unknown) {
    return this.request<unknown>('PATCH', `/internal/v1/marketplace/orders/${id}/status`, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl()}${path}`, {
        method,
        headers: internalServiceHeaders(
          this.config.get<string>('INTERNAL_SERVICE_TOKEN'),
          body ? { 'Content-Type': 'application/json' } : {},
        ),
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ServiceUnavailableException('marketplace unavailable');
    }
    if (!res.ok) {
      let payload: Record<string, unknown> = {};
      try {
        payload = (await res.json()) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
      if (res.status === 404) throw new NotFoundException(payload['message'] ?? 'Not found');
      throw new HttpException(payload['message'] ?? payload ?? res.statusText, res.status);
    }
    return (await res.json()) as T;
  }
}

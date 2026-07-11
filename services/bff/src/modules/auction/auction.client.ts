import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuctionListQuery } from './auction-search-policy';

export type AuctionListResponse = {
  items: unknown[];
  nextCursor: string | null;
  meta: {
    limit: number;
    searchScope: string;
    appliedFilters: Record<string, unknown>;
  };
};

@Injectable()
export class AuctionClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url = this.config.get<string>('AUCTION_URL') ?? 'http://localhost:3003';
    return url.replace(/\/$/, '');
  }

  listAuctions(query: AuctionListQuery & { searchMode?: 'TITLE' | 'FULL_TEXT' }) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === '') continue;
      params.set(key, String(value));
    }
    const suffix = params.size ? `?${params.toString()}` : '';
    return this.request<AuctionListResponse>('GET', `/internal/v1/auctions${suffix}`);
  }

  getAuction(auctionId: string) {
    return this.request<Record<string, unknown>>('GET', `/internal/v1/auctions/${auctionId}`);
  }

  listBids(auctionId: string) {
    return this.request<{ data: unknown[] }>('GET', `/internal/v1/auctions/${auctionId}/bids`);
  }

  listExpertAppraisals(auctionId: string) {
    return this.request<{ data: unknown[] }>(
      'GET',
      `/internal/v1/auctions/${auctionId}/expert-appraisals`,
    );
  }

  getSellerMeta(sellerId: string) {
    const qs = new URLSearchParams({ sellerId });
    return this.request<{ sellerId: string; lotsCreatedToday: number }>(
      'GET',
      `/internal/v1/auctions/meta/seller?${qs}`,
    );
  }

  createAuction(body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('POST', '/internal/v1/auctions', body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl()}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ServiceUnavailableException({
        type: 'upstream_unavailable',
        detail: 'auction service is unavailable',
      });
    }

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as T & { message?: string | string[] }) : ({} as T);

    if (response.ok) return payload;

    const detail =
      typeof payload === 'object' && payload && 'message' in payload
        ? payload.message
        : text || response.statusText;

    throw new HttpException({ type: 'upstream_error', detail }, response.status);
  }
}

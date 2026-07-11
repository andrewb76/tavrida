import { requireBearerToken } from './apiAuth';

export type CatalogStatus = 'ACTIVE' | 'ENDING_SOON' | 'SCHEDULED' | 'ENDED' | 'ALL';
export type CatalogSort =
  | 'ENDING_SOON'
  | 'NEWEST'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'RELEVANCE'
  | 'PROMOTED';

export type AuctionCard = {
  id: string;
  title: string;
  currentPrice: number;
  currency: string;
  status: string;
  type: string;
  startsAt: string | null;
  endsAt: string | null;
  thumbnailUrl: string | null;
  categoryId: string | null;
  bidCount: number;
  isLive: boolean;
  isPromoted: boolean;
  hasExpertAppraisal: boolean;
};

export type AuctionCatalogFilters = {
  q?: string;
  categoryId?: string;
  status?: CatalogStatus;
  sort?: CatalogSort;
  minPrice?: number;
  maxPrice?: number;
  type?: 'ENGLISH' | 'DUTCH';
  hasExpertAppraisal?: boolean;
  cursor?: string;
  limit?: number;
};

export type AuctionListResponse = {
  items: AuctionCard[];
  nextCursor: string | null;
  meta: {
    limit: number;
    searchScope: string;
    appliedFilters: Record<string, unknown>;
  };
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

export function buildAuctionQuery(filters: AuctionCatalogFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value == null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function listAuctions(
  filters: AuctionCatalogFilters = {},
): Promise<AuctionListResponse> {
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/auctions${buildAuctionQuery(filters)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось загрузить каталог');
  }
  return (await res.json()) as AuctionListResponse;
}

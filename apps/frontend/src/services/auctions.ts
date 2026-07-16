import { bffAuthHeaders } from './apiAuth';

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

export type AuctionDetail = {
  id: string;
  title: string;
  description: string;
  sellerId: string;
  categoryId: string | null;
  type: string;
  status: string;
  startingPrice: number;
  currentPrice: number;
  bidIncrement: number;
  currency: string;
  startsAt: string | null;
  endsAt: string | null;
  promotedUntil: string | null;
  reservePrice: number | null;
  images: string[];
  bidCount: number;
  hasExpertAppraisal: boolean;
  isLive: boolean;
  isPromoted: boolean;
  minNextBid: number;
  winnerId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuctionBid = {
  id: string;
  bidderId: string;
  amount: number;
  currency: string;
  placedAt: string;
  isWinning: boolean;
};

export type ExpertAppraisal = {
  id: string;
  expertId: string;
  summary: string;
  estimatedValueMin: number | null;
  estimatedValueMax: number | null;
  currency: string;
  createdAt: string;
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
  const res = await fetch(`${apiBase()}/auctions${buildAuctionQuery(filters)}`, {
    headers: await bffAuthHeaders(undefined, { json: false }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось загрузить каталог');
  }
  return (await res.json()) as AuctionListResponse;
}

async function authGet<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: await bffAuthHeaders(undefined, { json: false }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Ошибка запроса');
  }
  return (await res.json()) as T;
}

export async function getAuction(auctionId: string): Promise<AuctionDetail> {
  return authGet<AuctionDetail>(`/auctions/${encodeURIComponent(auctionId)}`);
}

export async function listAuctionBids(auctionId: string): Promise<AuctionBid[]> {
  const json = await authGet<{ data: AuctionBid[] }>(
    `/auctions/${encodeURIComponent(auctionId)}/bids`,
  );
  return json.data;
}

export async function listExpertAppraisals(auctionId: string): Promise<ExpertAppraisal[]> {
  const json = await authGet<{ data: ExpertAppraisal[] }>(
    `/auctions/${encodeURIComponent(auctionId)}/expert-appraisals`,
  );
  return json.data;
}

export type AuctionCreateOptions = {
  planId: string;
  allowedTypes: Array<'ENGLISH' | 'DUTCH'>;
  maxDurationHours: number | null;
  promotionEnabled: boolean;
  reserveEnabled: boolean;
  dailyLimit: { limit: number | null; used: number; remaining: number | null };
  promotionUnitPrice: number;
  reserveUnitPrice: number;
  imageLimits?: {
    countMax: number;
    sizeMaxMb: number;
    sizeMaxBytes: number;
    accept: string;
  };
};

export type CreateAuctionInput = {
  title: string;
  description: string;
  categoryId?: string;
  type: 'ENGLISH' | 'DUTCH';
  startingPrice: number;
  bidIncrement: number;
  startsAt: string;
  endsAt: string;
  images?: string[];
  reservePrice?: number;
  promote?: boolean;
};

async function authPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: await bffAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string; message?: string } | null;
    throw new Error(err?.detail ?? err?.message ?? 'Ошибка запроса');
  }
  return (await res.json()) as T;
}

export async function getAuctionCreateOptions(): Promise<AuctionCreateOptions> {
  return authGet<AuctionCreateOptions>('/auctions/create-options');
}

export async function createAuction(input: CreateAuctionInput): Promise<AuctionDetail> {
  return authPost<AuctionDetail>('/auctions', input);
}

export type PlaceBidResult = {
  bid: AuctionBid;
  auction: AuctionDetail;
};

export async function placeBid(
  auctionId: string,
  amount: number,
): Promise<PlaceBidResult> {
  return authPost<PlaceBidResult>(`/auctions/${encodeURIComponent(auctionId)}/bids`, {
    amount,
  });
}

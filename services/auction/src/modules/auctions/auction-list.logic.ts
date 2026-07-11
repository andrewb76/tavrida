export type CatalogStatus = 'ACTIVE' | 'ENDING_SOON' | 'SCHEDULED' | 'ENDED' | 'ALL';
export type CatalogSort =
  | 'ENDING_SOON'
  | 'NEWEST'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'RELEVANCE'
  | 'PROMOTED';

export type SearchMode = 'TITLE' | 'FULL_TEXT';

export type ListAuctionsInput = {
  q?: string;
  categoryId?: string;
  status?: CatalogStatus;
  sort?: CatalogSort;
  minPrice?: number;
  maxPrice?: number;
  type?: 'ENGLISH' | 'DUTCH';
  hasExpertAppraisal?: boolean;
  searchMode?: SearchMode;
  cursor?: string;
  limit?: number;
  now?: Date;
};

export type AuctionListRow = {
  id: string;
  title: string;
  description: string;
  currentPrice: number;
  currency: string;
  status: string;
  type: string;
  startsAt: Date | null;
  endsAt: Date | null;
  promotedUntil: Date | null;
  categoryId: string | null;
  bidCount: number;
  hasExpertAppraisal: boolean;
  images: string[];
  createdAt: Date;
};

const CATALOG_STATUSES = new Set<CatalogStatus>([
  'ACTIVE',
  'ENDING_SOON',
  'SCHEDULED',
  'ENDED',
  'ALL',
]);
const CATALOG_SORTS = new Set<CatalogSort>([
  'ENDING_SOON',
  'NEWEST',
  'PRICE_ASC',
  'PRICE_DESC',
  'RELEVANCE',
  'PROMOTED',
]);

export const ENDING_SOON_HOURS = 24;

export function normalizeCatalogStatus(raw?: string): CatalogStatus {
  if (raw && CATALOG_STATUSES.has(raw as CatalogStatus)) {
    return raw as CatalogStatus;
  }
  return 'ACTIVE';
}

export function normalizeCatalogSort(raw?: string, q?: string): CatalogSort {
  if (raw && CATALOG_SORTS.has(raw as CatalogSort)) {
    return raw as CatalogSort;
  }
  if (q && q.trim().length >= 2) return 'RELEVANCE';
  return 'ENDING_SOON';
}

export function clampLimit(raw?: number): number {
  return Math.min(Math.max(raw ?? 20, 1), 50);
}

export function decodeCursor(cursor?: string): { endsAt: string | null; id: string } | null {
  if (!cursor) return null;
  try {
    const json = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      endsAt?: string | null;
      id?: string;
    };
    if (!json.id) return null;
    return { endsAt: json.endsAt ?? null, id: json.id };
  } catch {
    return null;
  }
}

export function encodeCursor(row: { endsAt: Date | null; id: string }): string {
  return Buffer.from(
    JSON.stringify({
      endsAt: row.endsAt?.toISOString() ?? null,
      id: row.id,
    }),
  ).toString('base64url');
}

export function matchesCatalogStatus(row: AuctionListRow, status: CatalogStatus, now: Date): boolean {
  if (status === 'ALL') {
    return row.status === 'ACTIVE' || row.status === 'SCHEDULED' || row.status === 'ENDED';
  }
  if (status === 'ENDED') return row.status === 'ENDED';
  if (status === 'SCHEDULED') {
    return (
      row.status === 'SCHEDULED' ||
      (row.status === 'ACTIVE' && row.startsAt != null && row.startsAt > now)
    );
  }
  if (status === 'ENDING_SOON') {
    if (row.status !== 'ACTIVE' || !row.endsAt || row.endsAt <= now) return false;
    const msLeft = row.endsAt.getTime() - now.getTime();
    return msLeft <= ENDING_SOON_HOURS * 60 * 60 * 1000;
  }
  // ACTIVE (Live)
  return (
    row.status === 'ACTIVE' &&
    row.endsAt != null &&
    row.endsAt > now &&
    (row.startsAt == null || row.startsAt <= now)
  );
}

export function matchesSearch(row: AuctionListRow, q: string | undefined, mode: SearchMode): boolean {
  if (!q || q.trim().length < 2) return true;
  const needle = q.trim().toLowerCase();
  if (mode === 'FULL_TEXT') {
    return (
      row.title.toLowerCase().includes(needle) ||
      row.description.toLowerCase().includes(needle)
    );
  }
  return row.title.toLowerCase().includes(needle);
}

export function relevanceScore(row: AuctionListRow, q: string): number {
  const needle = q.trim().toLowerCase();
  let score = 0;
  if (row.title.toLowerCase().includes(needle)) score += 10;
  if (row.description.toLowerCase().includes(needle)) score += 3;
  return score;
}

export function isPromoted(row: AuctionListRow, now: Date): boolean {
  return row.promotedUntil != null && row.promotedUntil > now;
}

export function isLive(row: AuctionListRow, now: Date): boolean {
  return (
    row.status === 'ACTIVE' &&
    row.endsAt != null &&
    row.endsAt > now &&
    (row.startsAt == null || row.startsAt <= now)
  );
}

export function compareRows(
  a: AuctionListRow,
  b: AuctionListRow,
  sort: CatalogSort,
  now: Date,
  q?: string,
): number {
  if (sort === 'RELEVANCE' && q && q.trim().length >= 2) {
    return relevanceScore(b, q) - relevanceScore(a, q);
  }
  if (sort === 'NEWEST') {
    return b.createdAt.getTime() - a.createdAt.getTime();
  }
  if (sort === 'PRICE_ASC') return a.currentPrice - b.currentPrice;
  if (sort === 'PRICE_DESC') return b.currentPrice - a.currentPrice;
  if (sort === 'PROMOTED' || sort === 'ENDING_SOON') {
    const aPromoted = isPromoted(a, now) ? 1 : 0;
    const bPromoted = isPromoted(b, now) ? 1 : 0;
    if (bPromoted !== aPromoted) return bPromoted - aPromoted;
    const aExpert = a.hasExpertAppraisal ? 1 : 0;
    const bExpert = b.hasExpertAppraisal ? 1 : 0;
    if (bExpert !== aExpert) return bExpert - aExpert;
    const aEnds = a.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bEnds = b.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aEnds - bEnds;
  }
  return 0;
}

export function filterAndSortRows(
  rows: AuctionListRow[],
  input: ListAuctionsInput,
): AuctionListRow[] {
  const now = input.now ?? new Date();
  const status = normalizeCatalogStatus(input.status);
  const sort = normalizeCatalogSort(input.sort, input.q);
  const searchMode = input.searchMode ?? 'TITLE';

  let filtered = rows.filter((row) => matchesCatalogStatus(row, status, now));
  filtered = filtered.filter((row) => matchesSearch(row, input.q, searchMode));

  if (input.categoryId) {
    filtered = filtered.filter((row) => row.categoryId === input.categoryId);
  }
  if (input.type) {
    filtered = filtered.filter((row) => row.type === input.type);
  }
  if (input.hasExpertAppraisal === true) {
    filtered = filtered.filter((row) => row.hasExpertAppraisal);
  }
  if (input.minPrice != null) {
    filtered = filtered.filter((row) => row.currentPrice >= input.minPrice!);
  }
  if (input.maxPrice != null) {
    filtered = filtered.filter((row) => row.currentPrice <= input.maxPrice!);
  }

  filtered.sort((a, b) => compareRows(a, b, sort, now, input.q));
  return filtered;
}

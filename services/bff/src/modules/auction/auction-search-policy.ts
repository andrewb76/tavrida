export type AuctionSearchScope = 'TITLE' | 'FULL_TEXT' | 'FULL_TEXT,FILTERS';

const PLAN_SCOPE: Record<string, AuctionSearchScope> = {
  free: 'TITLE',
  basic: 'FULL_TEXT',
  pro: 'FULL_TEXT,FILTERS',
};

export function resolveSearchScope(planId: string): AuctionSearchScope {
  return PLAN_SCOPE[planId] ?? 'TITLE';
}

export function resolveSearchMode(scope: AuctionSearchScope): 'TITLE' | 'FULL_TEXT' {
  return scope === 'TITLE' ? 'TITLE' : 'FULL_TEXT';
}

export function filtersEnabled(scope: AuctionSearchScope): boolean {
  return scope.includes('FILTERS');
}

export type AuctionListQuery = {
  q?: string;
  categoryId?: string;
  status?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  type?: string;
  hasExpertAppraisal?: boolean;
  cursor?: string;
  limit?: number;
};

export function applySearchPolicy(
  query: AuctionListQuery,
  scope: AuctionSearchScope,
): { query: AuctionListQuery; searchMode: 'TITLE' | 'FULL_TEXT'; searchScope: AuctionSearchScope } {
  const searchMode = resolveSearchMode(scope);
  const proFilters = filtersEnabled(scope);
  const next: AuctionListQuery = { ...query };

  if (!proFilters) {
    delete next.minPrice;
    delete next.maxPrice;
    delete next.type;
    delete next.hasExpertAppraisal;
  }

  return { query: next, searchMode, searchScope: scope };
}

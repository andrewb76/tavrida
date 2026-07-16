import type { AuctionSearchScope } from './auction-search-policy';
import type { SellerPlanOptions } from './auction-seller-policy';

export type ResolvedTier = {
  planId: string;
  found: boolean;
  limitValue?: number | null;
  isFeatureEnabled?: boolean;
  enumValues?: string[] | null;
  priceAmount?: number | null;
  isEnabled?: boolean;
};

const FALLBACK_TYPES: Record<string, Array<'ENGLISH' | 'DUTCH'>> = {
  free: ['ENGLISH'],
  basic: ['ENGLISH', 'DUTCH'],
  pro: ['ENGLISH', 'DUTCH'],
};

const FALLBACK_DURATION_HOURS: Record<string, number | null> = {
  free: 72,
  basic: 336,
  pro: null,
};

const FALLBACK_SEARCH_SCOPE: Record<string, AuctionSearchScope> = {
  free: 'TITLE',
  basic: 'FULL_TEXT',
  pro: 'FULL_TEXT,FILTERS',
};

export function parseAuctionTypes(
  tier: ResolvedTier | null,
  planId: string,
): Array<'ENGLISH' | 'DUTCH'> {
  const values = tier?.found ? tier.enumValues : null;
  if (!values?.length) return FALLBACK_TYPES[planId] ?? FALLBACK_TYPES.free;

  if (values.some((value) => value.toLowerCase() === 'all')) {
    return ['ENGLISH', 'DUTCH'];
  }

  const types = values.filter(
    (value): value is 'ENGLISH' | 'DUTCH' => value === 'ENGLISH' || value === 'DUTCH',
  );
  return types.length ? types : (FALLBACK_TYPES[planId] ?? FALLBACK_TYPES.free);
}

export function parseDurationMaxHours(
  limitValue: number | null | undefined,
  planId: string,
): number | null {
  if (limitValue == null) return FALLBACK_DURATION_HOURS[planId] ?? 72;
  if (limitValue === -1) return null;
  return limitValue;
}

export function mapEnumToSearchScope(
  enumValues: string[] | null | undefined,
  planId: string,
): AuctionSearchScope {
  if (!enumValues?.length) return FALLBACK_SEARCH_SCOPE[planId] ?? 'TITLE';

  const normalized = enumValues.map((value) => value.toUpperCase());
  if (normalized.includes('FILTERS')) return 'FULL_TEXT,FILTERS';
  if (normalized.includes('FULL_TEXT')) return 'FULL_TEXT';
  if (normalized.includes('TITLE')) return 'TITLE';
  return FALLBACK_SEARCH_SCOPE[planId] ?? 'TITLE';
}

export function buildSellerPlanOptions(input: {
  planId: string;
  allowedTypes: Array<'ENGLISH' | 'DUTCH'>;
  maxDurationHours: number | null;
  promotionEnabled: boolean;
  reserveEnabled: boolean;
  dailyLimit: number | null;
  promotionUnitPrice: number;
  reserveUnitPrice: number;
}): SellerPlanOptions {
  return {
    planId: input.planId,
    allowedTypes: input.allowedTypes,
    maxDurationHours: input.maxDurationHours,
    promotionEnabled: input.promotionEnabled,
    reserveEnabled: input.reserveEnabled,
    dailyLimit: input.dailyLimit,
    promotionUnitPrice: input.promotionUnitPrice,
    reserveUnitPrice: input.reserveUnitPrice,
  };
}

export function promotionEnabledForPlan(planId: string): boolean {
  return planId === 'pro';
}

export function reserveEnabledForPlan(planId: string): boolean {
  return planId === 'pro';
}

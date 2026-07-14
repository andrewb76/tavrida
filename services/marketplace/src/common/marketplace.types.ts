export const LISTING_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const LISTING_CATEGORIES = [
  'restoration',
  'appraisal',
  'photography',
  'packing_delivery',
  'storage',
  'other',
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

/** plan-config keys from PLATFORM-REGISTRY */
export const MARKETPLACE_LIMIT_KEYS = {
  activeListings: 'marketplace.seller.listing.activeMax',
  portfolioItems: 'marketplace.seller.portfolio.itemMax',
  ordersMonthly: 'marketplace.buyer.order.monthlyMax',
} as const;

/** Allowed status transitions (from → to[]). */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'DISPUTED'],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ['CANCELLED', 'COMPLETED'],
};

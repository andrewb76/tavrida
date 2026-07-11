import { ForbiddenException } from '@nestjs/common';

export type SellerPlanOptions = {
  planId: string;
  allowedTypes: Array<'ENGLISH' | 'DUTCH'>;
  maxDurationHours: number | null;
  promotionEnabled: boolean;
  reserveEnabled: boolean;
  dailyLimit: number | null;
  promotionUnitPrice: number;
  reserveUnitPrice: number;
};

const SELLER_OPTIONS: Record<string, Omit<SellerPlanOptions, 'planId'>> = {
  free: {
    allowedTypes: ['ENGLISH'],
    maxDurationHours: 72,
    promotionEnabled: false,
    reserveEnabled: false,
    dailyLimit: 3,
    promotionUnitPrice: 200,
    reserveUnitPrice: 100,
  },
  basic: {
    allowedTypes: ['ENGLISH', 'DUTCH'],
    maxDurationHours: 336,
    promotionEnabled: false,
    reserveEnabled: false,
    dailyLimit: 10,
    promotionUnitPrice: 200,
    reserveUnitPrice: 100,
  },
  pro: {
    allowedTypes: ['ENGLISH', 'DUTCH'],
    maxDurationHours: null,
    promotionEnabled: true,
    reserveEnabled: true,
    dailyLimit: null,
    promotionUnitPrice: 200,
    reserveUnitPrice: 100,
  },
};

export function resolveSellerPlanOptions(planId: string): SellerPlanOptions {
  const base = SELLER_OPTIONS[planId] ?? SELLER_OPTIONS.free;
  return { planId, ...base };
}

export type CreateAuctionBody = {
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

export function applySellerCreatePolicy(
  body: CreateAuctionBody,
  options: SellerPlanOptions,
  lotsCreatedToday: number,
) {
  if (options.dailyLimit != null && lotsCreatedToday >= options.dailyLimit) {
    throw new ForbiddenException({
      type: 'limit_reached',
      detail: 'Достигнут дневной лимит создания лотов',
    });
  }

  const next: CreateAuctionBody & {
    maxDurationHours: number | null;
    allowedTypes: Array<'ENGLISH' | 'DUTCH'>;
  } = {
    ...body,
    maxDurationHours: options.maxDurationHours,
    allowedTypes: options.allowedTypes,
  };

  if (!options.reserveEnabled) delete next.reservePrice;
  if (!options.promotionEnabled) next.promote = false;

  return next;
}

export function dailyLimitSummary(options: SellerPlanOptions, lotsCreatedToday: number) {
  if (options.dailyLimit == null) {
    return { limit: null, used: lotsCreatedToday, remaining: null };
  }
  const remaining = Math.max(0, options.dailyLimit - lotsCreatedToday);
  return { limit: options.dailyLimit, used: lotsCreatedToday, remaining };
}

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

  if (body.reservePrice != null && !options.reserveEnabled) {
    throw new ForbiddenException({
      type: 'feature_not_available',
      detail: 'Резервная цена недоступна на текущем тарифе',
    });
  }
  if (body.promote === true && !options.promotionEnabled) {
    throw new ForbiddenException({
      type: 'feature_not_available',
      detail: 'Продвижение недоступно на текущем тарифе',
    });
  }

  return next;
}

export function dailyLimitSummary(options: SellerPlanOptions, lotsCreatedToday: number) {
  if (options.dailyLimit == null) {
    return { limit: null, used: lotsCreatedToday, remaining: null };
  }
  const remaining = Math.max(0, options.dailyLimit - lotsCreatedToday);
  return { limit: options.dailyLimit, used: lotsCreatedToday, remaining };
}

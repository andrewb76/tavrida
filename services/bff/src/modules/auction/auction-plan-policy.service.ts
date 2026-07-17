import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PlanConfigClient } from '../plan-config/plan-config.client';
import { AUCTION_PLAN_KEYS } from './auction-plan-keys';
import {
  buildSellerPlanOptions,
  mapEnumToSearchScope,
  parseAuctionTypes,
  parseDurationMaxHours,
  promotionEnabledForPlan,
  reserveEnabledForPlan,
  type ResolvedTier,
} from './auction-plan-policy.logic';
import type { AuctionSearchScope } from './auction-search-policy';
import { dailyLimitSummary, type SellerPlanOptions } from './auction-seller-policy';

const PRICE_FALLBACK = {
  promotionUnitPrice: 200,
  reserveUnitPrice: 100,
} as const;

@Injectable()
export class AuctionPlanPolicyService {
  private readonly logger = new Logger(AuctionPlanPolicyService.name);

  constructor(private readonly planConfig: PlanConfigClient) {}

  async resolvePlanId(userId: string): Promise<string> {
    try {
      const sub = await this.planConfig.getSubscription(userId);
      return sub.planId ?? 'free';
    } catch {
      return 'free';
    }
  }

  async resolveSearchScope(userId: string): Promise<AuctionSearchScope> {
    const planId = await this.resolvePlanId(userId);
    try {
      const tier = await this.planConfig.resolveTier(userId, AUCTION_PLAN_KEYS.searchScope);
      return mapEnumToSearchScope(tier.enumValues, tier.planId ?? planId);
    } catch (error) {
      this.logger.warn(
        `resolve-tier ${AUCTION_PLAN_KEYS.searchScope} failed — fallback: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return mapEnumToSearchScope(null, planId);
    }
  }

  async resolveSellerPlanOptions(
    userId: string,
    lotsCreatedToday: number,
  ): Promise<
    SellerPlanOptions & { dailyLimitSummary: ReturnType<typeof dailyLimitSummary> }
  > {
    const subscription = await this.planConfig.getSubscription(userId);
    const planId = subscription.planId;
    const [dailyCheck, promotion, reserve, durationLimit, typesTier] = await Promise.all([
      this.planConfig.checkLimit({
        userId,
        variableKey: AUCTION_PLAN_KEYS.dailyCreateMax,
        requestedValue: 1,
        currentUsage: lotsCreatedToday,
      }),
      this.planConfig.canUseFeature({
        userId,
        featureKey: AUCTION_PLAN_KEYS.promotionEnabled,
      }),
      this.planConfig.canUseFeature({
        userId,
        featureKey: AUCTION_PLAN_KEYS.reserveEnabled,
      }),
      this.planConfig.resolveLimitValue(userId, AUCTION_PLAN_KEYS.durationMaxHours),
      this.planConfig.resolveTier(userId, AUCTION_PLAN_KEYS.auctionTypesAllowed),
    ]);
    if (dailyCheck.reason || promotion.reason || reserve.reason) {
      throw new ServiceUnavailableException({
        type: 'plan_policy_unavailable',
        detail: 'Auction seller policy is incomplete',
      });
    }
    if (!typesTier.found || typesTier.isEnabled !== true || !typesTier.enumValues?.length) {
      throw new ServiceUnavailableException({
        type: 'plan_policy_unavailable',
        detail: `Plan variable ${AUCTION_PLAN_KEYS.auctionTypesAllowed} is not enforceable`,
      });
    }

    const [promotionPrice, reservePrice] = await Promise.all([
      promotion.allowed
        ? this.planConfig.resolvePrice(userId, AUCTION_PLAN_KEYS.promotionUnitPrice)
        : null,
      reserve.allowed
        ? this.planConfig.resolvePrice(userId, AUCTION_PLAN_KEYS.reserveUnitPrice)
        : null,
    ]);
    const options = buildSellerPlanOptions({
      planId: dailyCheck.planId ?? planId,
      allowedTypes: parseAuctionTypes(typesTier as ResolvedTier, planId),
      maxDurationHours: parseDurationMaxHours(durationLimit, planId),
      promotionEnabled: promotion.allowed,
      reserveEnabled: reserve.allowed,
      dailyLimit: dailyCheck.limit,
      promotionUnitPrice: promotionPrice?.amount ?? 0,
      reserveUnitPrice: reservePrice?.amount ?? 0,
    });

    return {
      ...options,
      dailyLimitSummary: dailyLimitSummary(options, lotsCreatedToday),
    };
  }

  async resolveSellerPlanOptionsForDisplay(userId: string, lotsCreatedToday: number) {
    try {
      return {
        ...(await this.resolveSellerPlanOptions(userId, lotsCreatedToday)),
        degraded: false,
      };
    } catch (error) {
      this.logger.warn(
        `auction seller plan-config resolve failed — conservative display fallback: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return {
        ...this.fallbackSellerOptions('free', lotsCreatedToday),
        degraded: true,
      };
    }
  }

  private fallbackSellerOptions(planId: string, lotsCreatedToday: number) {
    const dailyLimits: Record<string, number | null> = {
      free: 3,
      basic: 10,
      pro: null,
    };
    const dailyLimit = dailyLimits[planId] ?? dailyLimits.free;
    const options = buildSellerPlanOptions({
      planId,
      allowedTypes: parseAuctionTypes(null, planId),
      maxDurationHours: parseDurationMaxHours(undefined, planId),
      promotionEnabled: promotionEnabledForPlan(planId),
      reserveEnabled: reserveEnabledForPlan(planId),
      dailyLimit,
      promotionUnitPrice: PRICE_FALLBACK.promotionUnitPrice,
      reserveUnitPrice: PRICE_FALLBACK.reserveUnitPrice,
    });

    return {
      ...options,
      dailyLimitSummary: dailyLimitSummary(options, lotsCreatedToday),
    };
  }
}

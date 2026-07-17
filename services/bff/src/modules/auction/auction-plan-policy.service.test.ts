import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import type { PlanConfigClient } from '../plan-config/plan-config.client';
import { AuctionPlanPolicyService } from './auction-plan-policy.service';

function createPlanClient(overrides: Partial<PlanConfigClient> = {}) {
  return {
    getSubscription: async () => ({ planId: 'pro' }),
    checkLimit: async () => ({
      allowed: true,
      planId: 'pro',
      limit: null,
      remaining: null,
    }),
    canUseFeature: async () => ({ allowed: true, planId: 'pro' }),
    resolveLimitValue: async () => null,
    resolveTier: async () => ({
      planId: 'pro',
      found: true,
      key: 'auction.bidder.auctionTypes.allowed',
      enumValues: ['all'],
      isEnabled: true,
    }),
    resolvePrice: async (_userId: string, key: string) => ({
      key,
      planId: 'pro',
      amount: 100,
      currency: 'RUB',
      name: key,
    }),
    ...overrides,
  } as unknown as PlanConfigClient;
}

describe('AuctionPlanPolicyService', () => {
  it('resolves complete policy without static authorization fallback', async () => {
    const service = new AuctionPlanPolicyService(createPlanClient());
    const result = await service.resolveSellerPlanOptions('user-1', 2);

    assert.equal(result.planId, 'pro');
    assert.deepEqual(result.allowedTypes, ['ENGLISH', 'DUTCH']);
    assert.equal(result.promotionEnabled, true);
    assert.equal(result.promotionUnitPrice, 100);
  });

  it('fails closed when a required plan variable is unknown', async () => {
    const service = new AuctionPlanPolicyService(
      createPlanClient({
        checkLimit: async () => ({
          allowed: false,
          planId: 'pro',
          limit: null,
          remaining: 0,
          reason: 'unknown_variable',
        }),
      } as Partial<PlanConfigClient>),
    );

    await assert.rejects(
      () => service.resolveSellerPlanOptions('user-1', 0),
      (error: unknown) => error instanceof ServiceUnavailableException,
    );
  });

  it('uses conservative fallback only for display options', async () => {
    const service = new AuctionPlanPolicyService(
      createPlanClient({
        getSubscription: async () => {
          throw new Error('offline');
        },
      } as Partial<PlanConfigClient>),
    );
    const result = await service.resolveSellerPlanOptionsForDisplay('user-1', 0);

    assert.equal(result.degraded, true);
    assert.equal(result.planId, 'free');
    assert.equal(result.promotionEnabled, false);
    assert.deepEqual(result.allowedTypes, ['ENGLISH']);
  });
});

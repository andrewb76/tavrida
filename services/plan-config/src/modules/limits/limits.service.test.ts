import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PlanVariablesService } from '../plan-variables/plan-variables.service';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { LimitsService } from './limits.service';

function createLimitsHarness(tier: {
  limitValue?: number | null;
  isFeatureEnabled?: boolean;
  isEnabled?: boolean;
} | null) {
  const subscriptions = {
    resolvePlanId: async () => 'pro',
  } as Pick<SubscriptionsService, 'resolvePlanId'>;

  const planVariables = {
    getTier: async (_planId: string, _variableKey: string) =>
      tier
        ? ({
            planId: 'pro',
            variableKey: _variableKey,
            limitValue: tier.limitValue ?? null,
            isFeatureEnabled: tier.isFeatureEnabled ?? false,
            enumValues: null,
            priceAmount: null,
            isEnabled: tier.isEnabled ?? true,
          } as Awaited<ReturnType<PlanVariablesService['getTier']>>)
        : null,
  } as Pick<PlanVariablesService, 'getTier'>;

  return new LimitsService(
    subscriptions as SubscriptionsService,
    planVariables as PlanVariablesService,
  );
}

describe('LimitsService', () => {
  it('checkLimit allows unlimited when limit is -1', async () => {
    const service = createLimitsHarness({ limitValue: -1 });
    const result = await service.checkLimit({
      userId: 'user-1',
      variableKey: 'auction.bidder.participation.activeMax',
      requestedValue: 100,
      currentUsage: 50,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.limit, null);
    assert.equal(result.remaining, null);
  });

  it('checkLimit denies when usage exceeds limit', async () => {
    const service = createLimitsHarness({ limitValue: 5 });
    const result = await service.checkLimit({
      userId: 'user-1',
      variableKey: 'auction.bidder.participation.activeMax',
      requestedValue: 2,
      currentUsage: 4,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.limit, 5);
    assert.equal(result.remaining, 1);
  });

  it('checkLimit returns unknown_variable when tier is missing', async () => {
    const service = createLimitsHarness(null);
    const result = await service.checkLimit({
      userId: 'user-1',
      variableKey: 'auction.bidder.99missing.activeMax',
      requestedValue: 1,
      currentUsage: 0,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'unknown_variable');
  });

  it('checkLimit denies null and disabled tier limits', async () => {
    const missingValue = createLimitsHarness({ limitValue: null });
    const disabled = createLimitsHarness({ limitValue: 10, isEnabled: false });
    const input = {
      userId: 'user-1',
      variableKey: 'auction.seller.lot.dailyCreateMax',
      requestedValue: 1,
      currentUsage: 0,
    };

    assert.equal((await missingValue.checkLimit(input)).reason, 'invalid_limit');
    assert.equal((await disabled.checkLimit(input)).reason, 'tier_disabled');
  });

  it('canUseFeature reflects tier feature flag', async () => {
    const enabled = createLimitsHarness({ isFeatureEnabled: true });
    const disabled = createLimitsHarness({ isFeatureEnabled: false });

    assert.equal(
      (await enabled.canUseFeature({ userId: 'user-1', featureKey: 'auction.seller.promotion.enabled' }))
        .allowed,
      true,
    );
    assert.equal(
      (
        await disabled.canUseFeature({
          userId: 'user-1',
          featureKey: 'auction.seller.promotion.enabled',
        })
      ).allowed,
      false,
    );
  });
});

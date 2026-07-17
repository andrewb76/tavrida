import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PlanConfigClient } from '../plan-config/plan-config.client';
import { MediaLimitsService } from './media-limits.service';

describe('MediaLimitsService', () => {
  it('preserves an explicit zero size limit', async () => {
    const planConfig = {
      resolveLimitValue: async (_userId: string, key: string) =>
        key.endsWith('sizeMaxMb') ? 0 : 5,
    } as unknown as PlanConfigClient;
    const service = new MediaLimitsService(planConfig);

    const limits = await service.getLimits('user-1', 'marketplace');
    assert.equal(limits.countMax, 5);
    assert.equal(limits.sizeMaxMb, 0);
    assert.equal(limits.sizeMaxBytes, 0);
  });

  it('does not replace an unavailable size policy with a positive default', async () => {
    const planConfig = {
      resolveLimitValue: async () => null,
    } as unknown as PlanConfigClient;
    const service = new MediaLimitsService(planConfig);

    await assert.rejects(() => service.getLimits('user-1', 'auction'));
  });
});

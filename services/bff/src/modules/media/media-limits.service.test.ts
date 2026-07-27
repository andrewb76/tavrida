import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PlanConfigClient } from '../plan-config/plan-config.client';
import type { AuctionSettingsReader } from '../scalar-config/auction-settings.reader';
import { MediaLimitsService } from './media-limits.service';

describe('MediaLimitsService', () => {
  const auctionSettings = {
    lotImageAspect: async () => ({ aspectWidth: 4, aspectHeight: 3 }),
  } as unknown as AuctionSettingsReader;

  it('preserves an explicit zero size limit', async () => {
    const planConfig = {
      resolveLimitValue: async (_userId: string, key: string) =>
        key.endsWith('sizeMaxMb') ? 0 : 5,
    } as unknown as PlanConfigClient;
    const service = new MediaLimitsService(planConfig, auctionSettings);

    const limits = await service.getLimits('user-1', 'marketplace');
    assert.equal(limits.countMax, 5);
    assert.equal(limits.sizeMaxMb, 0);
    assert.equal(limits.sizeMaxBytes, 0);
    assert.equal(limits.aspectWidth, undefined);
  });

  it('does not replace an unavailable size policy with a positive default', async () => {
    const planConfig = {
      resolveLimitValue: async () => null,
    } as unknown as PlanConfigClient;
    const service = new MediaLimitsService(planConfig, auctionSettings);

    await assert.rejects(() => service.getLimits('user-1', 'auction'));
  });

  it('attaches lot image aspect for auction domain', async () => {
    const planConfig = {
      resolveLimitValue: async () => 3,
    } as unknown as PlanConfigClient;
    const service = new MediaLimitsService(planConfig, auctionSettings);

    const limits = await service.getLimits('user-1', 'auction');
    assert.equal(limits.aspectWidth, 4);
    assert.equal(limits.aspectHeight, 3);
  });
});

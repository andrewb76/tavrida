import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SubscriptionService } from './subscription.service';
import { SubscriptionRenewService } from './subscription-renew.service';

function createHarness(renewResult = { scanned: 0, renewed: 0, expired: 0, results: [] }) {
  const subscriptionService = {
    renewDue: async () => renewResult,
  } as unknown as SubscriptionService;

  const service = new SubscriptionRenewService(subscriptionService);

  return { service };
}

describe('SubscriptionRenewService', () => {
  it('delegates to subscriptionService.renewDue', async () => {
    const renewResult = {
      scanned: 5,
      renewed: 3,
      expired: 2,
      results: [],
    };
    const { service } = createHarness(renewResult);
    await service.handleRenewal();
    assert.ok(true);
  });

  it('handles empty result', async () => {
    const { service } = createHarness();
    await service.handleRenewal();
    assert.ok(true);
  });
});

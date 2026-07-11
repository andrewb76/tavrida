import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenException } from '@nestjs/common';

import {
  applySellerCreatePolicy,
  dailyLimitSummary,
  resolveSellerPlanOptions,
} from './auction-seller-policy';

describe('auction-seller-policy', () => {
  it('applySellerCreatePolicy blocks when daily limit reached', () => {
    const options = resolveSellerPlanOptions('free');
    assert.throws(
      () =>
        applySellerCreatePolicy(
          {
            title: 'Test lot',
            description: '1234567890',
            type: 'ENGLISH',
            startingPrice: 100,
            bidIncrement: 10,
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 3600_000).toISOString(),
          },
          options,
          3,
        ),
      ForbiddenException,
    );
  });

  it('dailyLimitSummary computes remaining', () => {
    const options = resolveSellerPlanOptions('free');
    assert.deepEqual(dailyLimitSummary(options, 1), { limit: 3, used: 1, remaining: 2 });
  });
});

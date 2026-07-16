import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenException } from '@nestjs/common';

import {
  applySellerCreatePolicy,
  dailyLimitSummary,
} from './auction-seller-policy';
import { buildSellerPlanOptions } from './auction-plan-policy.logic';

const freeOptions = buildSellerPlanOptions({
  planId: 'free',
  allowedTypes: ['ENGLISH'],
  maxDurationHours: 72,
  promotionEnabled: false,
  reserveEnabled: false,
  dailyLimit: 3,
  promotionUnitPrice: 200,
  reserveUnitPrice: 100,
});

describe('auction-seller-policy', () => {
  it('applySellerCreatePolicy blocks when daily limit reached', () => {
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
          freeOptions,
          3,
        ),
      ForbiddenException,
    );
  });

  it('dailyLimitSummary computes remaining', () => {
    assert.deepEqual(dailyLimitSummary(freeOptions, 1), { limit: 3, used: 1, remaining: 2 });
  });
});

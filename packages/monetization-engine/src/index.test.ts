import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeMrr,
  computeOneTimeRevenue,
  findBreakEvenMonth,
  registrationsForMonth,
  roundRub,
  simulate,
} from './index.js';

describe('money', () => {
  it('roundRub rounds to kopecks', () => {
    assert.equal(roundRub(10.555), 10.56);
  });
});

describe('computeMrr', () => {
  it('sums monthly and yearly plans', () => {
    const mrr = computeMrr({
      active: { basic: 10, pro: 2, basicYearly: 0, proYearly: 1 },
      prices: { basic: { monthly: 99, yearly: 990 }, pro: { monthly: 299, yearly: 2990 } },
      yearlyBillingSharePercent: 0,
    });
    assert.equal(mrr, roundRub(10 * 99 + 2 * 299 + 2990 / 12));
  });
});

describe('computeOneTimeRevenue', () => {
  it('counts enabled targets only', () => {
    const total = computeOneTimeRevenue(
      { promotionEvents: 3, reserveEvents: 0, customPresetEvents: 0, forumReactionEvents: {} },
      { 'auction.promotion': { amountRub: 50, enabled: true } },
    );
    assert.equal(total, 150);
  });
});

describe('registrationsForMonth', () => {
  it('linear model is constant', () => {
    assert.equal(
      registrationsForMonth({ type: 'linear', registrationsPerMonth: 40 }, 5),
      40,
    );
  });
});

describe('simulate', () => {
  it('produces deterministic ledger', () => {
    const result = simulate({
      periodMonths: 2,
      registrationsByMonth: [10, 10],
      planMix: { free: 0, basic: 100, pro: 0 },
      churnRatePercent: 0,
      yearlyBillingSharePercent: 0,
      prices: { basic: { monthly: 100, yearly: 1000 }, pro: { monthly: 200, yearly: 2000 } },
      activity: [
        {
          promotionEvents: 1,
          reserveEvents: 0,
          customPresetEvents: 0,
          forumReactionEvents: {},
        },
        {
          promotionEvents: 0,
          reserveEvents: 0,
          customPresetEvents: 0,
          forumReactionEvents: {},
        },
      ],
      oneTimePrices: { 'auction.promotion': { amountRub: 50, enabled: true } },
      referral: {
        programEnabled: false,
        attachRatePercent: 0,
        maxDepth: 3,
        depthCoefficients: [0.1, 0.05, 0.02],
        payoutDistributionByDepth: [50, 30, 20],
      },
      costItems: { hosting: 1000 },
      paymentProcessorPercent: 0,
      taxPercentOfNet: 0,
    });

    assert.equal(result.months.length, 2);
    assert.equal(result.months[0].oneTime, 50);
    assert.equal(result.months[0].mrr, 1000);
    assert.equal(result.breakEvenMonth, 1);
  });
});

describe('findBreakEvenMonth', () => {
  it('returns first month cumulative >= 0', () => {
    assert.equal(findBreakEvenMonth([-100, -20, 5, 50]), 3);
  });
});

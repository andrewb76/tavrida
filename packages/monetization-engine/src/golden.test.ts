import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeMrr,
  roundRub,
  simulate,
  sumFixedCosts,
  VARIABLE_COST_KEYS,
} from './index';
import type { SimulateInput } from './types';

/** Minimal 3-month scenario for regression lock (Checkpoint 1). */
export const GOLDEN_BASE_INPUT: SimulateInput = {
  periodMonths: 3,
  registrationsByMonth: [10, 10, 10],
  planMix: { free: 0, basic: 100, pro: 0 },
  churnRatePercent: 0,
  yearlyBillingSharePercent: 15,
  prices: { basic: { monthly: 100, yearly: 1000 }, pro: { monthly: 200, yearly: 2000 } },
  activity: [
    { promotionEvents: 0, reserveEvents: 0, customPresetEvents: 0, forumReactionEvents: {} },
    { promotionEvents: 0, reserveEvents: 0, customPresetEvents: 0, forumReactionEvents: {} },
    { promotionEvents: 0, reserveEvents: 0, customPresetEvents: 0, forumReactionEvents: {} },
  ],
  oneTimePrices: {},
  referral: {
    programEnabled: false,
    attachRatePercent: 0,
    maxDepth: 1,
    depthCoefficients: [1],
    payoutDistributionByDepth: [100],
    models: [{ modelId: 'revshare_single', enabled: false, params: { percentOfCharge: 10 } }],
  },
  costItems: {
    hosting: 500,
    payment_processor_percent: 2.5,
    tax_percent_of_net: 6,
  },
  depositsVolumeByMonth: [0, 0, 0],
  paymentProcessorPercent: 2.5,
  taxPercentOfNet: 6,
};

describe('sumFixedCosts', () => {
  it('excludes variable rate keys', () => {
    assert.deepEqual([...VARIABLE_COST_KEYS], ['payment_processor_percent', 'tax_percent_of_net']);
    assert.equal(
      sumFixedCosts({
        hosting: 8000,
        salaries: 12000,
        payment_processor_percent: 2.5,
        tax_percent_of_net: 6,
      }),
      20000,
    );
  });
});

describe('computeMrr yearly split', () => {
  it('does not double-apply yearlyBillingShare to monthly bucket', () => {
    const mrr = computeMrr({
      active: { basic: 8, pro: 0, basicYearly: 2, proYearly: 0 },
      prices: { basic: { monthly: 100, yearly: 1000 }, pro: { monthly: 200, yearly: 2000 } },
      yearlyBillingSharePercent: 15,
    });
    assert.equal(mrr, roundRub(8 * 100 + (2 * 1000) / 12));
  });
});

describe('golden scenarios', () => {
  it('base 3-month ledger matches snapshot', () => {
    const result = simulate(GOLDEN_BASE_INPUT);

    assert.equal(result.months.length, 3);
    assert.equal(result.months[0].mrr, 966.67);
    assert.equal(result.months[0].fixedCosts, 500);
    assert.equal(result.months[0].gross, 966.67);
    assert.equal(result.months[0].net, 438.67);

    assert.equal(result.months[2].mrr, 2900);
    assert.equal(result.months[2].cumulativeNet, 4042);
    assert.equal(result.breakEvenMonth, 1);
    assert.deepEqual(result.referralByModel, []);
  });

  it('referral on reduces net vs off', () => {
    const off = simulate(GOLDEN_BASE_INPUT);
    const on = simulate({
      ...GOLDEN_BASE_INPUT,
      referral: {
        ...GOLDEN_BASE_INPUT.referral,
        programEnabled: true,
        attachRatePercent: 100,
        models: [{ modelId: 'revshare_single', enabled: true, params: { percentOfCharge: 10 } }],
      },
    });

    assert.ok(on.months[2].referralOut > off.months[2].referralOut);
    assert.ok(on.months[2].net < off.months[2].net);
    assert.equal(on.referralByModel[0]?.modelId, 'revshare_single');
  });
});

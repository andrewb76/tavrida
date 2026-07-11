import {
  computeMonthlyNet,
  computeVariableCosts,
  findBreakEvenMonth,
  sumFixedCosts,
} from './costs/compute-costs';
import { computeOneTimeRevenue } from './one-time/compute-one-time';
import { computeReferralOut } from './referral/compute-referral-out';
import { computeMrr } from './subscriptions/compute-mrr';
import { normalizePlanMix } from './money';
import type {
  ActivePlansState,
  MonthlyLedger,
  PlanMix,
  SimulateInput,
  SimulateResult,
} from './types';

function applyChurn(state: ActivePlansState, churnRatePercent: number): ActivePlansState {
  const keep = 1 - churnRatePercent / 100;
  return {
    basic: Math.round(state.basic * keep),
    pro: Math.round(state.pro * keep),
    basicYearly: Math.round(state.basicYearly * keep),
    proYearly: Math.round(state.proYearly * keep),
  };
}

function addNewSubs(
  state: ActivePlansState,
  registrations: number,
  planMix: PlanMix,
  yearlyBillingSharePercent: number,
): ActivePlansState {
  const mix = normalizePlanMix(planMix);
  const yearlyShare = yearlyBillingSharePercent / 100;
  const basicNew = Math.round(registrations * mix.basic);
  const proNew = Math.round(registrations * mix.pro);

  return {
    basic: state.basic + Math.round(basicNew * (1 - yearlyShare)),
    pro: state.pro + Math.round(proNew * (1 - yearlyShare)),
    basicYearly: state.basicYearly + Math.round(basicNew * yearlyShare),
    proYearly: state.proYearly + Math.round(proNew * yearlyShare),
  };
}

/**
 * Compose pure formula modules into a month-by-month forecast.
 * Caller may precompute registrationsByMonth via growth module.
 */
export function simulate(input: SimulateInput): SimulateResult {
  const fixed = sumFixedCosts(input.costItems);
  let state: ActivePlansState = { basic: 0, pro: 0, basicYearly: 0, proYearly: 0 };
  const months: MonthlyLedger[] = [];
  let cumulativeNet = 0;
  let referralByDepth: { depth: number; payout: number }[] = [];

  for (let i = 0; i < input.periodMonths; i++) {
    const registrations = input.registrationsByMonth[i] ?? 0;
    state = addNewSubs(state, registrations, input.planMix, input.yearlyBillingSharePercent);
    state = applyChurn(state, input.churnRatePercent);

    const mrr = computeMrr({
      active: state,
      prices: input.prices,
      yearlyBillingSharePercent: input.yearlyBillingSharePercent,
    });

    const activity = input.activity[i] ?? {
      promotionEvents: 0,
      reserveEvents: 0,
      customPresetEvents: 0,
      forumReactionEvents: {},
    };
    const oneTime = computeOneTimeRevenue(activity, input.oneTimePrices);
    const gross = mrr + oneTime;

    const referral = computeReferralOut(gross, input.referral);
    referralByDepth = referral.byDepth;

    const deposits = input.depositsVolumeByMonth?.[i] ?? 0;
    const netBeforeTax = gross - referral.total - fixed;
    const variable = computeVariableCosts({
      gross,
      netBeforeTax,
      depositsVolume: deposits,
      items: input.costItems,
      paymentProcessorPercent: input.paymentProcessorPercent,
      taxPercentOfNet: input.taxPercentOfNet,
    });

    const net = computeMonthlyNet(gross, referral.total, fixed, variable);
    cumulativeNet += net;

    months.push({
      mrr,
      oneTime,
      gross,
      referralOut: referral.total,
      variableCosts: variable,
      fixedCosts: fixed,
      net,
      cumulativeNet,
    });
  }

  const breakEvenMonth = findBreakEvenMonth(months.map((m) => m.cumulativeNet));

  return { months, breakEvenMonth, referralByDepth };
}

export function compare(inputs: SimulateInput[]): SimulateResult[] {
  return inputs.map(simulate);
}

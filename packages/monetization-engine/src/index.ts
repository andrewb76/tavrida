export { MonetizationMath } from './monetization-math.js';

export {
  computeMonthlyNet,
  computeVariableCosts,
  findBreakEvenMonth,
  sumFixedCosts,
} from './costs/compute-costs.js';
export { buildRegistrationsSeries, registrationsForMonth } from './growth/registrations-for-month.js';
export { computeChargeAmount, computeOneTimeRevenue } from './one-time/compute-one-time.js';
export { computeReferralOut } from './referral/compute-referral-out.js';
export type { ReferralOutResult } from './referral/compute-referral-out.js';
export { compare, simulate } from './simulate.js';
export { computeMrr } from './subscriptions/compute-mrr.js';
export type { ComputeMrrInput } from './subscriptions/compute-mrr.js';
export { clamp, normalizePlanMix, roundRub } from './money.js';
export type { GrowthModel } from './types-growth.js';
export type {
  ActivePlansState,
  ActivitySnapshot,
  CostItems,
  MonthlyLedger,
  OneTimePriceMap,
  PlanId,
  PlanMix,
  PlanPrices,
  ReferralParams,
  SimulateInput,
  SimulateResult,
} from './types.js';

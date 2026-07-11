export { MonetizationMath } from './monetization-math';

export {
  computeMonthlyNet,
  computeVariableCosts,
  findBreakEvenMonth,
  sumFixedCosts,
  VARIABLE_COST_KEYS,
} from './costs/compute-costs';
export { buildRegistrationsSeries, registrationsForMonth } from './growth/registrations-for-month';
export { computeChargeAmount, computeOneTimeRevenue } from './one-time/compute-one-time';
export { computeReferralOut } from './referral/compute-referral-out';
export type { ReferralMonthContext, ReferralOutResult } from './referral/compute-referral-out';
export { REFERRAL_MODEL_IDS, isReferralModelId } from './referral/referral-model-ids';
export type { ReferralModelId } from './referral/referral-model-ids';
export { compare, simulate } from './simulate';
export { computeMrr } from './subscriptions/compute-mrr';
export type { ComputeMrrInput } from './subscriptions/compute-mrr';
export { clamp, normalizePlanMix, roundRub } from './money';
export type { GrowthModel } from './types-growth';
export type {
  ActivePlansState,
  ActivitySnapshot,
  CostItems,
  MonthlyLedger,
  OneTimePriceMap,
  PlanId,
  PlanMix,
  PlanPrices,
  ReferralModelInstance,
  ReferralModelParams,
  ReferralParams,
  SimulateInput,
  SimulateResult,
} from './types';

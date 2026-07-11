import { roundRub } from '../money';
import type { ActivePlansState, PlanPrices } from '../types';

export type ComputeMrrInput = {
  active: ActivePlansState;
  prices: PlanPrices;
  /** Kept for API compat; cohort state already splits monthly vs yearly buckets. */
  yearlyBillingSharePercent: number;
};

/**
 * Monthly recurring revenue from active subscriptions.
 * `active.basic` / `active.pro` — monthly billing; `*Yearly` — annual plans (amortized).
 */
export function computeMrr(input: ComputeMrrInput): number {
  const basicMonthly =
    input.active.basic * input.prices.basic.monthly +
    input.active.basicYearly * (input.prices.basic.yearly / 12);

  const proMonthly =
    input.active.pro * input.prices.pro.monthly +
    input.active.proYearly * (input.prices.pro.yearly / 12);

  return roundRub(basicMonthly + proMonthly);
}

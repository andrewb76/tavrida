import { roundRub } from '../money';
import type { ActivePlansState, PlanPrices } from '../types';

export type ComputeMrrInput = {
  active: ActivePlansState;
  prices: PlanPrices;
  yearlyBillingSharePercent: number;
};

/**
 * Monthly recurring revenue from active subscriptions.
 * Pure — caller tracks cohort state.
 */
export function computeMrr(input: ComputeMrrInput): number {
  const share = input.yearlyBillingSharePercent / 100;
  const monthlyShare = 1 - share;

  const basicMonthly =
    input.active.basic * monthlyShare * input.prices.basic.monthly +
    input.active.basicYearly * (input.prices.basic.yearly / 12);

  const proMonthly =
    input.active.pro * monthlyShare * input.prices.pro.monthly +
    input.active.proYearly * (input.prices.pro.yearly / 12);

  return roundRub(basicMonthly + proMonthly);
}

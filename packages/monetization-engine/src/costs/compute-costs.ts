import { roundRub } from '../money';
import type { CostItems } from '../types';

/** Keys stored as rates in costItems but applied in computeVariableCosts. */
export const VARIABLE_COST_KEYS = ['payment_processor_percent', 'tax_percent_of_net'] as const;

export type ComputeCostsInput = {
  gross: number;
  netBeforeTax: number;
  depositsVolume: number;
  items: CostItems;
  paymentProcessorPercent: number;
  taxPercentOfNet: number;
};

export function sumFixedCosts(items: CostItems): number {
  return roundRub(
    Object.entries(items)
      .filter(([key]) => !VARIABLE_COST_KEYS.includes(key as (typeof VARIABLE_COST_KEYS)[number]))
      .reduce((sum, [, value]) => sum + (Number.isFinite(value) ? value : 0), 0),
  );
}

export function computeVariableCosts(input: ComputeCostsInput): number {
  const processor = input.depositsVolume * (input.paymentProcessorPercent / 100);
  const tax = Math.max(0, input.netBeforeTax) * (input.taxPercentOfNet / 100);
  return roundRub(processor + tax);
}

export function computeMonthlyNet(
  gross: number,
  referralOut: number,
  fixedCosts: number,
  variableCosts: number,
): number {
  return roundRub(gross - referralOut - fixedCosts - variableCosts);
}

/**
 * First month index (1-based) where cumulative net >= 0.
 * manualBurnOverride affects threshold only when provided (Oracle UX).
 */
export function findBreakEvenMonth(
  cumulativeNetByMonth: number[],
  manualBurnOverride?: number | null,
): number | null {
  if (cumulativeNetByMonth.length === 0) return null;

  for (let i = 0; i < cumulativeNetByMonth.length; i++) {
    const cum = cumulativeNetByMonth[i];
    if (manualBurnOverride != null && manualBurnOverride > 0) {
      const threshold = manualBurnOverride * (i + 1);
      if (cum >= threshold) return i + 1;
    } else if (cum >= 0) {
      return i + 1;
    }
  }
  return null;
}

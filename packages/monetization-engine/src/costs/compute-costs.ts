import { roundRub } from '../money';
import type { CostItems } from '../types';

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
    Object.values(items).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0),
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

import { roundRub } from '../money.js';
import type { ReferralParams } from '../types.js';

export type ReferralOutResult = {
  total: number;
  byDepth: { depth: number; payout: number }[];
};

/**
 * Referral outflow from eligible gross (simplified v1).
 */
export function computeReferralOut(
  gross: number,
  params: ReferralParams,
  /** Share of gross that qualifies (e.g. subscription-only). */
  eligibleFraction = 1,
): ReferralOutResult {
  if (!params.programEnabled || gross <= 0) {
    return { total: 0, byDepth: [] };
  }

  const attach = params.attachRatePercent / 100;
  const eligible = gross * eligibleFraction * attach;
  const byDepth: { depth: number; payout: number }[] = [];
  let total = 0;

  const depthLimit = Math.min(params.maxDepth, params.depthCoefficients.length);
  for (let d = 1; d <= depthLimit; d++) {
    const coeff = params.depthCoefficients[d - 1] ?? 0;
    const dist = (params.payoutDistributionByDepth[d - 1] ?? 0) / 100;
    const payout = roundRub(eligible * coeff * dist);
    byDepth.push({ depth: d, payout });
    total += payout;
  }

  return { total: roundRub(total), byDepth };
}

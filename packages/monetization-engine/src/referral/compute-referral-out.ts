import { roundRub } from '../money';
import type { PlanMix, ReferralModelInstance, ReferralParams } from '../types';
import type { ReferralModelId } from './referral-model-ids';

export type ReferralMonthContext = {
  registrations: number;
  planMix: PlanMix;
};

export type ReferralOutResult = {
  total: number;
  byDepth: { depth: number; payout: number }[];
  byModel: { modelId: ReferralModelId; payout: number }[];
};

function paidSharePercent(planMix: PlanMix): number {
  return (planMix.basic + planMix.pro) / 100;
}

function newPayingReferrals(
  context: ReferralMonthContext,
  attachRatePercent: number,
): number {
  return context.registrations * paidSharePercent(context.planMix) * (attachRatePercent / 100);
}

function mergeDepthPayouts(
  target: Map<number, number>,
  depth: number,
  amount: number,
): void {
  target.set(depth, (target.get(depth) ?? 0) + amount);
}

function toByDepth(map: Map<number, number>): { depth: number; payout: number }[] {
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([depth, payout]) => ({ depth, payout: roundRub(payout) }));
}

function computeModelPayout(
  modelId: ReferralModelId,
  model: ReferralModelInstance,
  gross: number,
  params: ReferralParams,
  context: ReferralMonthContext,
  depthMap: Map<number, number>,
): number {
  const attach = params.attachRatePercent / 100;
  const eligibleGross = gross * attach;

  switch (modelId) {
    case 'revshare_single': {
      const percent = model.params.percentOfCharge ?? 10;
      const payout = roundRub(eligibleGross * (percent / 100));
      mergeDepthPayouts(depthMap, 1, payout);
      return payout;
    }
    case 'revshare_multi_decay': {
      const percent = model.params.percentOfCharge ?? 10;
      const maxDepth = Math.min(
        model.params.maxDepth ?? params.maxDepth ?? 3,
        params.depthCoefficients.length,
      );
      let total = 0;
      for (let d = 1; d <= maxDepth; d++) {
        const coeff = params.depthCoefficients[d - 1] ?? 0;
        const dist = (params.payoutDistributionByDepth[d - 1] ?? 0) / 100;
        const payout = roundRub(eligibleGross * (percent / 100) * coeff * dist);
        mergeDepthPayouts(depthMap, d, payout);
        total += payout;
      }
      return roundRub(total);
    }
    case 'cpa_first_charge': {
      const fixed = model.params.fixedAmountRub ?? 0;
      const count = newPayingReferrals(context, params.attachRatePercent);
      const payout = roundRub(count * fixed);
      mergeDepthPayouts(depthMap, 1, payout);
      return payout;
    }
    case 'bilateral_first_sub': {
      const inviter = model.params.inviterBonusRub ?? 0;
      const invitee = model.params.inviteeBonusRub ?? 0;
      const count = newPayingReferrals(context, params.attachRatePercent);
      const payout = roundRub(count * (inviter + invitee));
      mergeDepthPayouts(depthMap, 1, payout);
      return payout;
    }
    default:
      return 0;
  }
}

/**
 * Referral outflow — сумма всех включённых моделей (combo).
 */
export function computeReferralOut(
  gross: number,
  params: ReferralParams,
  context: ReferralMonthContext,
): ReferralOutResult {
  const empty = { total: 0, byDepth: [], byModel: [] as ReferralOutResult['byModel'] };
  if (!params.programEnabled || gross <= 0) return empty;

  const activeModels = params.models.filter((m) => m.enabled);
  if (!activeModels.length) return empty;

  const depthMap = new Map<number, number>();
  const byModel: ReferralOutResult['byModel'] = [];
  let total = 0;

  for (const model of activeModels) {
    const payout = computeModelPayout(model.modelId, model, gross, params, context, depthMap);
    if (payout > 0) {
      byModel.push({ modelId: model.modelId, payout });
      total += payout;
    }
  }

  return {
    total: roundRub(total),
    byDepth: toByDepth(depthMap),
    byModel,
  };
}

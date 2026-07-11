import type { ReferralModelId } from './referral/referral-model-ids';

/** Plan identifiers aligned with financial-policy. */
export type PlanId = 'free' | 'basic' | 'pro';

export type PlanMix = Record<PlanId, number>;

export type PlanPrices = {
  basic: { monthly: number; yearly: number };
  pro: { monthly: number; yearly: number };
};

export type ActivePlansState = {
  basic: number;
  pro: number;
  basicYearly: number;
  proYearly: number;
};

export type OneTimePriceMap = Record<string, { amountRub: number; enabled: boolean }>;

export type ActivitySnapshot = {
  promotionEvents: number;
  reserveEvents: number;
  customPresetEvents: number;
  forumReactionEvents: Record<string, number>;
};

export type ReferralModelParams = {
  percentOfCharge?: number;
  maxDepth?: number;
  fixedAmountRub?: number;
  inviterBonusRub?: number;
  inviteeBonusRub?: number;
};

export type ReferralModelInstance = {
  modelId: ReferralModelId;
  enabled: boolean;
  params: ReferralModelParams;
};

export type ReferralParams = {
  programEnabled: boolean;
  attachRatePercent: number;
  /** Fallback depth for multi_decay when model omits maxDepth. */
  maxDepth: number;
  depthCoefficients: number[];
  payoutDistributionByDepth: number[];
  models: ReferralModelInstance[];
};

export type CostItems = Record<string, number>;

export type MonthlyLedger = {
  mrr: number;
  oneTime: number;
  gross: number;
  referralOut: number;
  variableCosts: number;
  fixedCosts: number;
  net: number;
  cumulativeNet: number;
};

export type SimulateInput = {
  periodMonths: number;
  /** Per-month registrations (precomputed by growth model). */
  registrationsByMonth: number[];
  planMix: PlanMix;
  churnRatePercent: number;
  yearlyBillingSharePercent: number;
  prices: PlanPrices;
  activity: ActivitySnapshot[];
  oneTimePrices: OneTimePriceMap;
  referral: ReferralParams;
  costItems: CostItems;
  depositsVolumeByMonth?: number[];
  paymentProcessorPercent: number;
  taxPercentOfNet: number;
};

export type SimulateResult = {
  months: MonthlyLedger[];
  breakEvenMonth: number | null;
  referralByDepth: { depth: number; payout: number }[];
  referralByModel: { modelId: string; payout: number }[];
};

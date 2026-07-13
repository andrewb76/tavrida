export type RangeSpec = {
  min?: number;
  max?: number;
  default?: number | boolean | null;
  step?: number;
  label?: string;
  enabled?: boolean;
  unit?: string;
};

export type GrowthModelId = 'linear' | 'exponential' | 'logistic_s_curve';

export type PlanMix = { free: number; basic: number; pro: number };

export type ReferralModelId =
  | 'revshare_single'
  | 'revshare_multi_decay'
  | 'cpa_first_charge'
  | 'bilateral_first_sub';

export type ReferralModelState = {
  enabled: boolean;
  params: Record<string, number>;
};

export type VangaSimulateRequest = {
  periodMonths: number;
  growth: {
    model: GrowthModelId;
    registrationsPerMonth?: number;
    registrationsMonth1?: number;
    monthlyGrowthRatePercent?: number;
    carryingCapacity?: number;
    inflectionMonth?: number;
    steepness?: number;
  };
  cohort: {
    planMix: PlanMix;
    churnPercent: number;
    yearlyBillingSharePercent?: number;
  };
  subscriptions?: {
    basic?: { monthlyPrice?: number; yearlyPrice?: number };
    pro?: { monthlyPrice?: number; yearlyPrice?: number };
  };
  oneTimePrices?: Record<string, { amountRub?: number; enabled?: boolean }>;
  activity?: {
    auctionsPerUserPerMonth?: number;
    promotionAttachRatePercent?: number;
    reserveAttachRatePercent?: number;
    customPresetAttachRatePercent?: number;
  };
  referral?: {
    programEnabled?: boolean;
    attachRatePercent?: number;
    maxDepth?: number;
    models?: { modelId: ReferralModelId; enabled: boolean; params: Record<string, number> }[];
  };
  costs?: {
    items?: Record<string, number>;
    manualTotalBurn?: number | null;
  };
  deposits?: {
    avgAmountRub?: number;
    eventsPerPayingUserPerMonth?: number;
    shareOfUsersDepositingPercent?: number;
  };
};

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

export type SimulateResult = {
  months: MonthlyLedger[];
  breakEvenMonth: number | null;
  referralByDepth: { depth: number; payout: number }[];
  referralByModel?: { modelId: string; payout: number }[];
};

export type VangaDefaultsResponse = {
  version: string;
  currency: string;
  config: Record<string, unknown>;
  overlay: Record<string, unknown>;
};

export type VangaFormState = {
  periodMonths: number;
  preset: 'base' | 'optimistic' | 'pessimistic';
  growthModel: GrowthModelId;
  registrationsPerMonth: number;
  registrationsMonth1: number;
  monthlyGrowthRatePercent: number;
  carryingCapacity: number;
  inflectionMonth: number;
  steepness: number;
  planMix: PlanMix;
  churnPercent: number;
  yearlyBillingSharePercent: number;
  basicMonthly: number;
  basicYearly: number;
  proMonthly: number;
  proYearly: number;
  auctionsPerUserPerMonth: number;
  promotionAttachRatePercent: number;
  reserveAttachRatePercent: number;
  customPresetAttachRatePercent: number;
  referralProgramEnabled: boolean;
  referralAttachRatePercent: number;
  referralEditModelId: ReferralModelId;
  referralModels: Record<ReferralModelId, ReferralModelState>;
  costItems: Record<string, number>;
  manualTotalBurn: number;
  manualBurnOnly: boolean;
  oneTimePrices: Record<string, { amountRub: number; enabled: boolean }>;
  avgDepositRub: number;
  depositsPerUser: number;
  shareDepositingPercent: number;
};

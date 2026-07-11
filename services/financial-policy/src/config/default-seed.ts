import type { ParameterValueType } from '../entities/parameter.entity';

export type SeedPlan = {
  id: string;
  title: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
};

export type SeedParameter = {
  key: string;
  service: string;
  name: string;
  description: string;
  valueType: ParameterValueType;
};

export type SeedPlanParameter = {
  parameterKey: string;
  free: { limitValue?: number | null; isFeatureEnabled?: boolean };
  basic: { limitValue?: number | null; isFeatureEnabled?: boolean };
  pro: { limitValue?: number | null; isFeatureEnabled?: boolean };
};

export const SEED_PLANS: SeedPlan[] = [
  {
    id: 'free',
    title: 'Бесплатно',
    description: 'Базовый доступ к клубу',
    monthlyPrice: 0,
    yearlyPrice: 0,
  },
  {
    id: 'basic',
    title: 'Базовый',
    description: 'Расширенные лимиты',
    monthlyPrice: 99,
    yearlyPrice: 990,
  },
  {
    id: 'pro',
    title: 'Про',
    description: 'Максимум возможностей',
    monthlyPrice: 399,
    yearlyPrice: 3990,
  },
];

/** Subset from PLATFORM-REGISTRY — enough for limits/check in v1. */
export const SEED_PARAMETERS: SeedParameter[] = [
  {
    key: 'club.invitesPerMonth',
    service: 'user-profile',
    name: 'Инвайты в месяц',
    description: 'Новых инвайт-кодов в месяц',
    valueType: 'limit',
  },
  {
    key: 'auction.activeAuctions',
    service: 'auction',
    name: 'Активные аукционы',
    description: 'Макс. одновременных участий',
    valueType: 'limit',
  },
  {
    key: 'auction.promotionEnabled',
    service: 'auction',
    name: 'Продвижение лота',
    description: 'Доступ к promotion по тарифу',
    valueType: 'feature',
  },
  {
    key: 'referralRewards.programEnabled',
    service: 'referral-rewards',
    name: 'Денежный реферал',
    description: 'Участие тарифа в выплатах',
    valueType: 'feature',
  },
  {
    key: 'referralRewards.maxEarnedPerMonth',
    service: 'referral-rewards',
    name: 'Cap реферала / мес',
    description: 'Макс. начислений реферала на пользователя',
    valueType: 'limit',
  },
];

export const SEED_PLAN_PARAMETERS: SeedPlanParameter[] = [
  {
    parameterKey: 'club.invitesPerMonth',
    free: { limitValue: 1 },
    basic: { limitValue: 3 },
    pro: { limitValue: -1 },
  },
  {
    parameterKey: 'auction.activeAuctions',
    free: { limitValue: 5 },
    basic: { limitValue: 20 },
    pro: { limitValue: -1 },
  },
  {
    parameterKey: 'auction.promotionEnabled',
    free: { isFeatureEnabled: false },
    basic: { isFeatureEnabled: false },
    pro: { isFeatureEnabled: true },
  },
  {
    parameterKey: 'referralRewards.programEnabled',
    free: { isFeatureEnabled: false },
    basic: { isFeatureEnabled: true },
    pro: { isFeatureEnabled: true },
  },
  {
    parameterKey: 'referralRewards.maxEarnedPerMonth',
    free: { limitValue: 500 },
    basic: { limitValue: 3000 },
    pro: { limitValue: 10000 },
  },
];

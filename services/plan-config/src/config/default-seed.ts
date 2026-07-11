/**
 * TEMPORARY local dev bootstrap — NOT the target architecture.
 * @see docs/13-maintenance/registry-keys.md
 */
import type { PlanVariableValueType } from '../entities/plan-variable.entity';

export type SeedPlan = {
  id: string;
  title: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
};

export type SeedPlanVariable = {
  key: string;
  service: string;
  name: string;
  description: string;
  valueType: PlanVariableValueType;
};

export type TierSeed = {
  limitValue?: number | null;
  isFeatureEnabled?: boolean;
  priceAmount?: number | null;
  isEnabled?: boolean;
};

export type SeedPlanVariableTiers = {
  variableKey: string;
  free: TierSeed;
  basic: TierSeed;
  pro: TierSeed;
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

/** Dev bootstrap subset — domain services own sync manifests in production. */
export const SEED_PLAN_VARIABLES: SeedPlanVariable[] = [
  {
    key: 'club.member.01invite.monthlyMax',
    service: 'user-profile',
    name: 'Инвайты в месяц',
    description: 'Новых инвайт-кодов в месяц. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'auction.bidder.01participation.activeMax',
    service: 'auction',
    name: 'Торгов со ставками (bidder)',
    description: 'Макс. чужих аукционов с одновременным участием. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'auction.seller.01lot.activeMax',
    service: 'auction',
    name: 'Своих лотов ACTIVE (seller)',
    description: 'Макс. собственных лотов ACTIVE. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'auction.seller.02lot.dailyCreateMax',
    service: 'auction',
    name: 'Новых лотов в сутки (seller)',
    description: 'Лотов за календарные сутки. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'auction.seller.04promotion.enabled',
    service: 'auction',
    name: 'Продвижение лота (тариф)',
    description: 'Доступ к promotion по тарифу',
    valueType: 'feature',
  },
  {
    key: 'auction.seller.08promotion.unitPrice',
    service: 'auction',
    name: 'Продвижение лота (цена)',
    description: 'Разовое списание за promotion',
    valueType: 'price',
  },
  {
    key: 'auction.seller.09reservePrice.unitPrice',
    service: 'auction',
    name: 'Резервная цена (цена)',
    description: 'Разовое списание за резерв',
    valueType: 'price',
  },
  {
    key: 'auction.member.01search.scope',
    service: 'auction',
    name: 'Глубина поиска в каталоге',
    description: 'TITLE | FULL_TEXT | FULL_TEXT,FILTERS',
    valueType: 'enum',
  },
  {
    key: 'auction.member.02search.filtersEnabled',
    service: 'auction',
    name: 'Расширенные фильтры каталога',
    description: 'Pro-фильтры: цена, тип, экспертиза',
    valueType: 'feature',
  },
  {
    key: 'referralRewards.program.01payout.enabled',
    service: 'referral-rewards',
    name: 'Денежный реферал',
    description: 'Участие тарифа в выплатах',
    valueType: 'feature',
  },
  {
    key: 'referralRewards.member.01earn.monthlyMax',
    service: 'referral-rewards',
    name: 'Cap реферала / мес',
    description: 'Макс. начислений реферала на пользователя',
    valueType: 'limit',
  },
];

export const SEED_PLAN_VARIABLE_TIERS: SeedPlanVariableTiers[] = [
  {
    variableKey: 'club.member.01invite.monthlyMax',
    free: { limitValue: 1 },
    basic: { limitValue: 3 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'auction.bidder.01participation.activeMax',
    free: { limitValue: 5 },
    basic: { limitValue: 20 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'auction.seller.01lot.activeMax',
    free: { limitValue: 2 },
    basic: { limitValue: 5 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'auction.seller.02lot.dailyCreateMax',
    free: { limitValue: 3 },
    basic: { limitValue: 10 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'auction.seller.04promotion.enabled',
    free: { isFeatureEnabled: false },
    basic: { isFeatureEnabled: false },
    pro: { isFeatureEnabled: true },
  },
  {
    variableKey: 'auction.seller.08promotion.unitPrice',
    free: { priceAmount: 200, isEnabled: false },
    basic: { priceAmount: 220, isEnabled: false },
    pro: { priceAmount: 200, isEnabled: true },
  },
  {
    variableKey: 'auction.seller.09reservePrice.unitPrice',
    free: { priceAmount: 100, isEnabled: false },
    basic: { priceAmount: 110, isEnabled: false },
    pro: { priceAmount: 100, isEnabled: true },
  },
  {
    variableKey: 'auction.member.01search.scope',
    free: { enumValues: ['TITLE'] },
    basic: { enumValues: ['FULL_TEXT'] },
    pro: { enumValues: ['FULL_TEXT', 'FILTERS'] },
  },
  {
    variableKey: 'auction.member.02search.filtersEnabled',
    free: { isFeatureEnabled: false },
    basic: { isFeatureEnabled: false },
    pro: { isFeatureEnabled: true },
  },
  {
    variableKey: 'referralRewards.program.01payout.enabled',
    free: { isFeatureEnabled: false },
    basic: { isFeatureEnabled: true },
    pro: { isFeatureEnabled: true },
  },
  {
    variableKey: 'referralRewards.member.01earn.monthlyMax',
    free: { limitValue: 100 },
    basic: { limitValue: 500 },
    pro: { limitValue: -1 },
  },
];

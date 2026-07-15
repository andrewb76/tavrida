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
  enumValues?: string[] | null;
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
    key: 'club.member.invite.monthlyMax',
    service: 'user-profile',
    name: 'Инвайты в месяц',
    description: 'Новых инвайт-кодов в месяц. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'auction.bidder.participation.activeMax',
    service: 'auction',
    name: 'Торгов со ставками (bidder)',
    description: 'Макс. чужих аукционов с одновременным участием. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'auction.seller.lot.activeMax',
    service: 'auction',
    name: 'Своих лотов ACTIVE (seller)',
    description: 'Макс. собственных лотов ACTIVE. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'auction.seller.lot.dailyCreateMax',
    service: 'auction',
    name: 'Новых лотов в сутки (seller)',
    description: 'Лотов за календарные сутки. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'auction.seller.promotion.enabled',
    service: 'auction',
    name: 'Продвижение лота (тариф)',
    description: 'Доступ к promotion по тарифу',
    valueType: 'feature',
  },
  {
    key: 'auction.seller.promotion.unitPrice',
    service: 'auction',
    name: 'Продвижение лота (цена)',
    description: 'Разовое списание за promotion',
    valueType: 'price',
  },
  {
    key: 'auction.seller.reservePrice.unitPrice',
    service: 'auction',
    name: 'Резервная цена (цена)',
    description: 'Разовое списание за резерв',
    valueType: 'price',
  },
  {
    key: 'auction.member.search.scope',
    service: 'auction',
    name: 'Глубина поиска в каталоге',
    description: 'TITLE | FULL_TEXT | FULL_TEXT,FILTERS',
    valueType: 'enum',
  },
  {
    key: 'auction.member.search.filtersEnabled',
    service: 'auction',
    name: 'Расширенные фильтры каталога',
    description: 'Pro-фильтры: цена, тип, экспертиза',
    valueType: 'feature',
  },
  {
    key: 'auction.seller.image.countMax',
    service: 'auction',
    name: 'Фото на лот (seller)',
    description: 'Макс. изображений на один лот. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'auction.seller.image.sizeMaxMb',
    service: 'auction',
    name: 'Размер фото лота (MB)',
    description: 'Макс. размер одного изображения лота в мегабайтах.',
    valueType: 'limit',
  },
  {
    key: 'forum.author.attachment.countMax',
    service: 'forum',
    name: 'Вложения на пост',
    description: 'Макс. файлов на тему или комментарий. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'forum.author.attachment.sizeMaxMb',
    service: 'forum',
    name: 'Размер вложения (MB)',
    description: 'Макс. размер одного вложения в мегабайтах.',
    valueType: 'limit',
  },
  {
    key: 'referralRewards.program.enabled',
    service: 'referral-rewards',
    name: 'Денежный реферал',
    description: 'Участие тарифа в выплатах',
    valueType: 'feature',
  },
  {
    key: 'referralRewards.earning.monthlyMax',
    service: 'referral-rewards',
    name: 'Cap реферала / мес',
    description: 'Макс. начислений реферала на пользователя',
    valueType: 'limit',
  },
  {
    key: 'subscriptions.member.auction.categoryMax',
    service: 'subscriptions',
    name: 'Подписки на категории аукциона',
    description: 'Макс. подписок на категории. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'subscriptions.member.auction.lotMax',
    service: 'subscriptions',
    name: 'Подписки на лоты',
    description: 'Макс. подписок на конкретные лоты. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'subscriptions.member.forum.categoryMax',
    service: 'subscriptions',
    name: 'Подписки на категории форума',
    description: 'Макс. подписок на категории форума. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'subscriptions.member.forum.topicMax',
    service: 'subscriptions',
    name: 'Подписки на темы форума',
    description: 'Макс. подписок на темы. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'subscriptions.member.tag.max',
    service: 'subscriptions',
    name: 'Подписки на теги',
    description: 'Макс. подписок на теги. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'subscriptions.member.notify.emailDigestEnabled',
    service: 'subscriptions',
    name: 'Email digest',
    description: 'Сводные email-дайджесты по подпискам',
    valueType: 'feature',
  },
  {
    key: 'marketplace.seller.listing.activeMax',
    service: 'marketplace',
    name: 'Активные услуги',
    description: 'Макс. активных объявлений. 0 = только заказчик. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'marketplace.buyer.order.monthlyMax',
    service: 'marketplace',
    name: 'Заказы / мес',
    description: 'Макс. заказов в месяц для заказчика. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'marketplace.seller.portfolio.itemMax',
    service: 'marketplace',
    name: 'Портфолио на услугу',
    description: 'Макс. фото в портфолио на объявление. −1 = без лимита.',
    valueType: 'limit',
  },
  {
    key: 'marketplace.seller.portfolio.image.sizeMaxMb',
    service: 'marketplace',
    name: 'Размер фото портфолио',
    description: 'Макс. размер одного фото портфолио (MB).',
    valueType: 'limit',
  },
];

export const SEED_PLAN_VARIABLE_TIERS: SeedPlanVariableTiers[] = [
  {
    variableKey: 'club.member.invite.monthlyMax',
    free: { limitValue: 1 },
    basic: { limitValue: 3 },
    pro: { limitValue: 10 },
  },
  {
    variableKey: 'auction.bidder.participation.activeMax',
    free: { limitValue: 5 },
    basic: { limitValue: 20 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'auction.seller.lot.activeMax',
    free: { limitValue: 2 },
    basic: { limitValue: 5 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'auction.seller.lot.dailyCreateMax',
    free: { limitValue: 3 },
    basic: { limitValue: 10 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'auction.seller.promotion.enabled',
    free: { isFeatureEnabled: false },
    basic: { isFeatureEnabled: false },
    pro: { isFeatureEnabled: true },
  },
  {
    variableKey: 'auction.seller.promotion.unitPrice',
    free: { priceAmount: 200, isEnabled: false },
    basic: { priceAmount: 220, isEnabled: false },
    pro: { priceAmount: 200, isEnabled: true },
  },
  {
    variableKey: 'auction.seller.reservePrice.unitPrice',
    free: { priceAmount: 100, isEnabled: false },
    basic: { priceAmount: 110, isEnabled: false },
    pro: { priceAmount: 100, isEnabled: true },
  },
  {
    variableKey: 'auction.member.search.scope',
    free: { enumValues: ['TITLE'] },
    basic: { enumValues: ['FULL_TEXT'] },
    pro: { enumValues: ['FULL_TEXT', 'FILTERS'] },
  },
  {
    variableKey: 'auction.member.search.filtersEnabled',
    free: { isFeatureEnabled: false },
    basic: { isFeatureEnabled: false },
    pro: { isFeatureEnabled: true },
  },
  {
    variableKey: 'auction.seller.image.countMax',
    free: { limitValue: 3 },
    basic: { limitValue: 5 },
    pro: { limitValue: 8 },
  },
  {
    variableKey: 'auction.seller.image.sizeMaxMb',
    free: { limitValue: 3 },
    basic: { limitValue: 5 },
    pro: { limitValue: 10 },
  },
  {
    variableKey: 'forum.author.attachment.countMax',
    free: { limitValue: 1 },
    basic: { limitValue: 3 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'forum.author.attachment.sizeMaxMb',
    free: { limitValue: 2 },
    basic: { limitValue: 5 },
    pro: { limitValue: 20 },
  },
  {
    variableKey: 'referralRewards.program.enabled',
    free: { isFeatureEnabled: false },
    basic: { isFeatureEnabled: true },
    pro: { isFeatureEnabled: true },
  },
  {
    variableKey: 'referralRewards.earning.monthlyMax',
    free: { limitValue: 100 },
    basic: { limitValue: 500 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'subscriptions.member.auction.categoryMax',
    free: { limitValue: 3 },
    basic: { limitValue: 10 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'subscriptions.member.auction.lotMax',
    free: { limitValue: 5 },
    basic: { limitValue: 20 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'subscriptions.member.forum.categoryMax',
    free: { limitValue: 5 },
    basic: { limitValue: 15 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'subscriptions.member.forum.topicMax',
    free: { limitValue: 10 },
    basic: { limitValue: 50 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'subscriptions.member.tag.max',
    free: { limitValue: 3 },
    basic: { limitValue: 10 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'subscriptions.member.notify.emailDigestEnabled',
    free: { isFeatureEnabled: false },
    basic: { isFeatureEnabled: false },
    pro: { isFeatureEnabled: true },
  },
  {
    variableKey: 'marketplace.seller.listing.activeMax',
    free: { limitValue: 0 },
    basic: { limitValue: 3 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'marketplace.buyer.order.monthlyMax',
    free: { limitValue: 2 },
    basic: { limitValue: 10 },
    pro: { limitValue: -1 },
  },
  {
    variableKey: 'marketplace.seller.portfolio.itemMax',
    free: { limitValue: 0 },
    basic: { limitValue: 5 },
    pro: { limitValue: 20 },
  },
  {
    variableKey: 'marketplace.seller.portfolio.image.sizeMaxMb',
    free: { limitValue: 0 },
    basic: { limitValue: 3 },
    pro: { limitValue: 8 },
  },
];

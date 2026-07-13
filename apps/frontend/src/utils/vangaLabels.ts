/** Русские подписи для Vanga UI (без англ. в интерфейсе). */

export const VANGA_ONE_TIME_LABELS: Record<string, string> = {
  'auction.promotion': 'Продвижение лота',
  'auction.reservePrice': 'Резервная цена',
  'auction.customDurationPreset': 'Свой срок аукциона',
  'forum.reaction.rocket': 'Реакция «Ракета»',
  'forum.reaction.fire': 'Реакция «Огонь»',
  'forum.reaction.brain': 'Реакция «Мозг»',
  'marketplace.listingPromotion': 'Продвижение услуги',
  'marketplace.platformFee': 'Комиссия маркетплейса',
};

export const VANGA_COST_KEY_LABELS: Record<string, string> = {
  hosting: 'Хостинг / VPS',
  cdn_and_storage: 'CDN и хранилище',
  logto_and_auth: 'Logto и авторизация',
  novu_notifications: 'Уведомления (Novu)',
  payment_processor_percent: 'Эквайринг, % от депозитов',
  acquiring_fixed_per_month: 'Эквайринг, фикс / мес',
  tax_percent_of_net: 'Налог, % от чистого дохода',
  salaries: 'Зарплаты',
  moderation_contract: 'Модерация (подряд)',
  legal_accounting: 'Юрист / бухгалтерия',
  misc_buffer: 'Прочий резерв',
};

export function oneTimeLabelRu(key: string): string {
  return VANGA_ONE_TIME_LABELS[key] ?? key.replace(/\./g, ' · ');
}

export function costLabelRu(
  key: string,
  yamlLabel?: string,
): string {
  return yamlLabel ?? VANGA_COST_KEY_LABELS[key] ?? key.replace(/_/g, ' ');
}

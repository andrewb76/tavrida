/** Cookie / local storage consent — L-07. Bump when policy text or categories change. */
export const COOKIE_CONSENT_VERSION = '2026-07-23';

export const COOKIE_CONSENT_STORAGE_KEY = 'tavrida.cookie-consent';

export type CookieCategoryId = 'necessary' | 'analytics' | 'marketing';

export type CookieCategoryPrefs = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type CookieConsentRecord = {
  version: string;
  decidedAt: string;
  categories: CookieCategoryPrefs;
};

export const COOKIE_CATEGORIES: Array<{
  id: CookieCategoryId;
  title: string;
  description: string;
  required: boolean;
}> = [
  {
    id: 'necessary',
    title: 'Обязательные',
    description:
      'Сессия входа (Logto), безопасность, тема оформления и ваш выбор по cookie. Без них сайт не работает как задумано.',
    required: true,
  },
  {
    id: 'analytics',
    title: 'Аналитика',
    description:
      'Помогают понять, как пользуются сервисом (счётчики посещений). Сейчас не подключены — включатся только после согласия.',
    required: false,
  },
  {
    id: 'marketing',
    title: 'Маркетинг',
    description:
      'Рекламные и ретаргетинговые метки. Сейчас не используются — включатся только после согласия.',
    required: false,
  },
];

export function defaultPrefs(optional = false): CookieCategoryPrefs {
  return {
    necessary: true,
    analytics: optional,
    marketing: optional,
  };
}

/** Публичное имя бренда (кириллица). См. .cursor/rules/public-copy-ru.mdc */
export const BRAND_NAME = 'Таврида Лот';

export const BRAND_NAME_PARTS = {
  first: 'Таврида',
  second: 'Лот',
} as const;

/** Основной lockup — полный цвет, горизонтальный (брендбук §4, принят v0). */
export const BRAND_LOGO_LIGHT_URL = '/branding/logo-full-color.svg';
export const BRAND_LOGO_DARK_URL = '/branding/logo-full-color-dark.svg';

/** Favicon / app icon — монограмма без слова. */
export const BRAND_MARK_LIGHT_URL = '/branding/tavrida-mark-light.svg';
export const BRAND_MARK_DARK_URL = '/branding/tavrida-mark.svg';

/** @deprecated Используй BRAND_MARK_DARK_URL */
export const BRAND_FAVICON_URL = BRAND_MARK_DARK_URL;

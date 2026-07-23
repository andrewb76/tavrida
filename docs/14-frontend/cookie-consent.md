# Cookie consent (L-07)

> **Статус:** implemented (draft legal text) · **SPA:** `@tavrida/frontend`  
> **Юр. реестр:** [legal-documents.md](../01-goal/legal-documents.md) L-07

## Цель

Уведомление об использовании cookie / localStorage **до** загрузки необязательных
скриптов (аналитика, маркетинг). Соответствует минимуму для РФ (информирование +
выбор) и готовит gate под будущие счётчики.

## Поведение

| Действие | Результат |
|----------|-----------|
| **Принять все** | `analytics` + `marketing` = true |
| **Только необходимые** | optional = false |
| **Настроить** | чекбоксы по категориям → «Сохранить выбор» |
| Смена `COOKIE_CONSENT_VERSION` | баннер показывается снова |
| Ссылка «Настройки cookie» | повторный выбор |

Хранение: `localStorage` ключ `tavrida.cookie-consent`  
`{ version, decidedAt, categories: { necessary: true, analytics, marketing } }`.

## Категории

1. **Обязательные** — Logto session, безопасность, тема, запись согласия (всегда on).
2. **Аналитика** — off by default; сейчас **нет** подключённых скриптов.
3. **Маркетинг** — off by default; не используется.

Загрузка optional SDK только через `useAnalyticsGate()` (`loadAnalyticsIfAllowed` /
`loadMarketingIfAllowed`).

## UI / маршруты

| Элемент | Путь / место |
|---------|----------------|
| Баннер | `App.vue` → `CookieConsentBanner` (все зоны) |
| Политика | `/cookies` (`CookiePolicyView`, public) |
| Footer | landing + PublicLayout; кнопка настроек |
| Код | `config/cookie-consent.ts`, `stores/cookieConsent.ts` |

Копирайт публичных экранов — **русский** ([public-copy-ru](../../.cursor/rules/public-copy-ru.mdc)).

## Перед production

- [ ] Текст L-07 утверждён юристом
- [ ] L-02 (конфиденциальность) опубликован и связан с `/cookies`
- [ ] При подключении Yandex/GA/etc. — вызов только через `useAnalyticsGate`
- [ ] При необходимости — синхронизация согласия с user-profile (post-MVP)

**Связано:** [legal-documents.md](../01-goal/legal-documents.md) · [screen-tree.md](../11-ux-ui/screen-tree.md) · [14-frontend/README.md](./README.md)

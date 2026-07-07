# 💻 Фронтенд-приложение (`@tavrida/frontend`)

> **Статус:** draft · **Версия:** 0.1
>
> Техническая спецификация SPA. Продуктовая сторона (что видит пользователь) — [platform-for-users.md](../01-goal/platform-for-users.md). Wireframes и дизайн — [11-ux-ui](../11-ux-ui/README.md).

## 🎯 Назначение

Единственное публичное клиентское приложение Tavrida Lot: аукционы, форум, профиль, баланс, маркет услуг. Реализовано как **Vue 3 SPA** (Vite, client-side rendering), общается с бэкендом **только через BFF** (REST + WebSocket). Внутренняя топология микросервисов клиенту не видна.

- Каталог и страница лота, ставки в реальном времени
- Форум: темы, комментарии, реакции, чат *(Pro)*
- Профиль, рейтинг, отзывы после сделок
- Баланс, подписки Free/Basic/Pro, разовые платежи
- In-app центр уведомлений

## 📦 Стек и решения

| Слой | Выбор | Примечание |
|------|-------|------------|
| Framework | **Vue 3** (`<script setup>`, Composition API) | уже в каркасе |
| Bundler / dev | **Vite 6** | dev-порт `5173` |
| Язык | **TypeScript** (strict) | базовый tsconfig `@tavrida/tsconfig/vue.json` |
| Роутинг | **vue-router 4** | history mode |
| State (клиентский) | **Pinia** | сессия, UI-состояние, черновики |
| State (серверный) | **TanStack Query (Vue Query)** | кэш, инвалидция, retry для REST |
| HTTP-клиент | тонкая обёртка над `fetch` (`ofetch`) | JWT + `Idempotency-Key` + базовый URL |
| Realtime | нативный `WebSocket` в composable | реконнект, подписка на каналы |
| Auth | **Logto Vue SDK** (`@logto/vue`) | OIDC PKCE, silent refresh |
| Стили | **Tailwind CSS** + дизайн-токены | mobile-first |
| UI-компоненты | **`@tavrida/ui`** на headless-базе (**Reka UI**) | общие примитивы + токены |
| i18n | **vue-i18n** | `ru` по умолчанию (ключи готовы к мультиязычности) |
| Уведомления | **Novu Inbox** (Vue-компонент) | in-app inbox |
| Тесты | **Vitest** + `@vue/test-utils`, **Playwright** (e2e) | — |
| Линт | общий flat-config из `tools/config` | `eslint-plugin-vue` |

> **Решение по API:** фронт использует REST + WS согласно [ADR-002](../03-architecture/adr/002-bff-rest-wss.md). GraphQL **не применяется**; пакет `@tavrida/graphql` — легаси (см. [Открытые вопросы](#-открытые-вопросы)).

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **SPA** | Single Page Application, рендер на клиенте |
| **BFF** | Backend-for-Frontend, единственный API для фронта ([bff](../05-microservices/bff/README.md)) |
| **Channel** | WS-подписка: `auction:{id}`, `user:{id}`, `forum:{topicId}` |
| **Server-state** | Данные из API, кэшируемые TanStack Query |
| **View** | Страница, привязанная к маршруту (`src/views`) |
| **Composable** | Переиспользуемая логика (`useX()`, `src/composables`) |

## 🗂️ Структура каталогов

Целевая структура (текущий каркас — только `main.ts` + `App.vue`):

```
apps/frontend/
├── index.html
├── vite.config.ts
├── src/
│   ├── main.ts                # bootstrap: router, pinia, query, i18n, logto
│   ├── App.vue
│   ├── router/                # маршруты + guard'ы (auth, tariff)
│   ├── stores/                # Pinia: session, ui, drafts
│   ├── views/                 # страницы по разделам
│   │   ├── auctions/          # каталог, лот
│   │   ├── forum/             # список тем, тема
│   │   ├── profile/           # профиль, рейтинг
│   │   ├── wallet/            # баланс, подписки, платежи
│   │   └── marketplace/       # услуги
│   ├── components/            # фичевые компоненты (не примитивы)
│   ├── composables/           # useApi, useWs, useAuth, useAuction…
│   ├── api/                   # REST-клиент, типы, ключи query
│   ├── ws/                    # WS-клиент, реестр каналов
│   ├── i18n/                  # локали (ru)
│   ├── assets/                # статика, стили Tailwind
│   └── types/
└── tests/                     # unit (Vitest) + e2e (Playwright)
```

Общие примитивы и дизайн-токены выносятся в **`@tavrida/ui`**, чтобы переиспользовать в будущем admin-ui.

## 🔌 Взаимодействие с API

### REST

Все запросы идут на BFF (`/api/v1/*`), карта префиксов — [bff](../05-microservices/bff/README.md), контракт — [06-api](../06-api/README.md). Единый клиент отвечает за:

- подстановку `Authorization: Bearer <jwt>` (токен из Logto);
- `Idempotency-Key` для мутаций (BFF проксирует его в upstream);
- обработку ошибок в общий формат (см. [06-api](../06-api/README.md));
- базовый URL из `VITE_API_BASE_URL`.

```http
POST /api/v1/auctions
Authorization: Bearer <jwt>
Idempotency-Key: <uuid>
```

Server-state кэшируется через TanStack Query; ключи запросов централизованы в `src/api`. Мутации инвалидируют связанные запросы (например, ставка → инвалидация лота и истории ставок).

### WebSocket

```http
wss://{host}/ws/v1?token={jwt}
```

`useWs()` держит одно соединение, поддерживает реконнект и подписку на каналы. Входящие события синхронизируются с кэшем TanStack Query.

| Channel | События | Экран |
|---------|---------|-------|
| `auction:{id}` | `bid.placed`, `auction.ended` | страница лота (таймер, история ставок) |
| `user:{id}` | `notification.new`, `balance.updated` | inbox, баланс в шапке |
| `forum:{topicId}` | `message.new`, `reaction.added` | тема форума, чат *(Pro)* |

## 🔒 Безопасность и auth

- **Вход** через **Logto** (OIDC, Authorization Code + PKCE), SDK `@logto/vue`.
- JWT хранится и обновляется SDK; для API берётся `getAccessToken()`.
- Router-guard'ы: `requireAuth` (гость → на страницу входа) и проверка тарифа для Pro-фич (мягкая — UI показывает upgrade-подсказку, авторитетная проверка на бэке через [financial-policy](../05-microservices/financial-policy/README.md)).
- CORS/rate-limit — на стороне BFF; фронт корректно обрабатывает `429`.
- Клиент **не** содержит бизнес-лимитов как источника правды — только UX-подсказки; ограничения enforce'ит бэк.

## 🎨 UI и стилизация

- **Tailwind CSS**, mobile-first, дизайн-токены (цвета, типографика, spacing) — единый источник в `@tavrida/ui`.
- Примитивы (`Button`, `Modal`, `Toast`, `Tabs`…) на **Reka UI** (headless, доступность из коробки).
- Тёмная тема — через токены (в объёме v1 опционально).
- Подробные wireframes и экраны — [11-ux-ui](../11-ux-ui/README.md).

## 🌍 i18n

`vue-i18n`, основная локаль `ru`. Тексты — через ключи (не хардкод), чтобы оставить путь к мультиязычности. Форматирование чисел/дат/валюты (₽) — через `Intl`.

## ⚙️ Окружение

Только переменные с префиксом `VITE_` попадают в клиентский бандл (публичны — секретов не класть).

| Переменная | Описание | Пример |
|------------|----------|--------|
| `VITE_API_BASE_URL` | базовый URL REST BFF | `https://api.tavrida-lot.ru/api/v1` |
| `VITE_WS_URL` | URL WebSocket BFF | `wss://api.tavrida-lot.ru/ws/v1` |
| `VITE_LOGTO_ENDPOINT` | endpoint Logto | `https://auth.tavrida-lot.ru` |
| `VITE_LOGTO_APP_ID` | ID SPA-приложения в Logto | `xxxxx` |
| `VITE_NOVU_APP_ID` | application identifier Novu Inbox | `xxxxx` |

> Полный реестр env и секретов: [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md).

## 🏗️ Сборка и запуск

```bash
pnpm --filter @tavrida/frontend dev       # Vite dev-сервер :5173
pnpm --filter @tavrida/frontend build      # vue-tsc -b && vite build
pnpm --filter @tavrida/frontend preview
pnpm --filter @tavrida/frontend lint
```

Артефакт — статические файлы, раздаются через Traefik; API/WS проксируются на BFF.

## 🧪 Тестирование

| Уровень | Инструмент | Что покрываем |
|---------|-----------|---------------|
| Unit | Vitest + `@vue/test-utils` | composables, stores, утилиты |
| Component | Vitest + Testing Library | ключевые компоненты (ставка, форма лота) |
| E2E | Playwright | сценарии из [platform-for-users](../01-goal/platform-for-users.md): создать лот, сделать ставку, оставить отзыв |

Общие принципы — [08-testing](../08-testing/README.md).

## ❓ Открытые вопросы

- **`@tavrida/graphql`** — не используется (API = REST). Решить: удалить пакет или переназначить в `@tavrida/api-client` (типы + клиент, сгенерированные из OpenAPI BFF).
- **Дизайн-токены** — источник (Figma → токены) не определён.
- **Тёмная тема** — в объёме v1 или позже.
- **SEO** — SPA не индексируется. Если каталог лотов/форум нужны в поиске — вернуться к вопросу prerender/SSR (сейчас out of scope).
- **admin-ui** — отдельное приложение или модуль; переиспользование `@tavrida/ui` (см. [architecture TODO](../03-architecture/README.md)).

## 📋 TODO

- [ ] Скелет: router, pinia, TanStack Query, i18n, Logto в `main.ts`
- [ ] Настроить Tailwind + дизайн-токены
- [ ] REST-клиент (`src/api`) + типы из контракта BFF
- [ ] `useWs()` + реестр каналов
- [ ] Наполнить `@tavrida/ui` примитивами (Reka UI)
- [ ] Заглушки views по разделам
- [ ] Vitest + Playwright конфиги
- [ ] Разрешить судьбу `@tavrida/graphql`

## 🔗 Связанные разделы

- [platform-for-users](../01-goal/platform-for-users.md) — продукт для людей
- [11-ux-ui](../11-ux-ui/README.md) — wireframes, компоненты, дизайн
- [bff](../05-microservices/bff/README.md) — API/WS, к которому подключается фронт
- [06-api](../06-api/README.md) — контракт REST, ошибки, идемпотентность
- [ADR-002](../03-architecture/adr/002-bff-rest-wss.md) — REST + WebSocket
- [09-security](../09-security/README.md) — auth, Logto, RBAC

---

**Автор:** команда разработки · **Версия:** 0.1-draft

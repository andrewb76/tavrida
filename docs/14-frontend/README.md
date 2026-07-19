# 💻 Фронтенд-приложение (`@tavrida/frontend`)

> **Статус:** SPA v1 implemented · **Версия:** 0.3
>
> Техническая спецификация SPA. Продуктовая сторона (что видит пользователь) — [platform-for-users.md](../01-goal/platform-for-users.md). Wireframes и дизайн — [11-ux-ui](../11-ux-ui/README.md).

## 🎯 Назначение

Единственное публичное клиентское приложение Tavrida Lot: аукционы, форум,
профиль, баланс, подписки и маркет услуг. Реализовано как **Vue 3 SPA** и
общается с backend через BFF REST. WebSocket/realtime остаётся target.

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
| State (серверный) | direct services + Pinia stores | TanStack Query — target, не runtime layer |
| HTTP-клиент | тонкие service wrappers над native `fetch` | JWT + `Idempotency-Key` + базовый URL |
| Realtime | planned | WS client/channel registry пока отсутствуют |
| Auth | **Logto Vue SDK** (`@logto/vue`) | OIDC PKCE, silent refresh |
| Стили | **Tailwind CSS v4** + CSS variables | mobile-first, [stack-decisions](./stack-decisions.md) |
| UI-компоненты | local components + **`@tavrida/ui`** | Reka UI — target |
| Стек (детали) | [stack-decisions.md](./stack-decisions.md) | Tailwind v4, d3, RxJS, tiers |
| i18n | **vue-i18n** | `ru` по умолчанию (ключи готовы к мультиязычности) |
| Уведомления | service integration planned | Novu Inbox component пока отсутствует |
| Тесты | Node test runner / build checks | Vitest + Playwright — target |
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

Упрощённая целевая карта. Runtime уже содержит router, stores, services,
composables и member/admin views; имена ниже не являются точным snapshot:

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

## 🗺️ Маршруты

| Path | View | Auth | Wireframe |
|------|------|------|-----------|
| `/` | LandingView (visitor) / HomeView (member) | visitor / member | [W01](../11-ux-ui/wireframes/home-auth.md) — visitor: full-bleed hero + pillars + join |
| `/about` | AboutView | public | W01 |
| `/join` | JoinView | invite link / код → Logto | W11 |
| `/invite` | redirect → `/join` | legacy URL | W11 |
| `/auctions` | AuctionListView | **member** | [W02](../11-ux-ui/wireframes/auctions.md) |
| `/auctions/new` | AuctionCreateView | member | W04 |
| `/auctions/:id` | AuctionDetailView | **member** | W03 |
| `/forum` | ForumListView | **member** | [W05](../11-ux-ui/wireframes/forum.md) |
| `/forum/topics/:id` | TopicView | **member** | W06 |
| `/forum/new` | TopicCreateView | member | W05 |
| `/profile/me` | ProfileSelfView | member | W07 |
| `/profile/:userId` | ProfilePublicView | **member** | W07 |
| `/invites` | InvitesView | member | W01 |
| `/wallet` | WalletView | member | [W08](../11-ux-ui/wireframes/profile-wallet.md) |
| `/plans` | PlansView | member | W08 |
| `/marketplace` | MarketplaceListView | **member** | [W09](../11-ux-ui/wireframes/marketplace.md) |
| `/marketplace/:id` | ServiceDetailView | **member** | W09 |
| `/callback` | LogtoCallback | — | W01 |

Guards: `requireMember` (club content), `requireAuth`, `requirePlan('pro')` (UX-only hint + server enforce).

> IA: [information-architecture](../11-ux-ui/information-architecture.md)

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

### Конкурентные запросы и смена identity

Текущие экраны, которые ещё используют прямой `fetch`, применяют правило
**latest request wins**: route/filter generation проверяется перед изменением
data, error и loading. Detail views наблюдают route param с
`{ immediate: true }`, потому что Vue Router переиспользует component instance.

Identity-scoped состояние (`roles`, balance, subscriptions) коммитится только
если effective identity (`actAsUserId ?? userId`) не изменилась. Logout,
impersonation start/stop инвалидируют cache epoch; завершившийся старый запрос
не может записать данные предыдущего пользователя.

### WebSocket

```http
wss://{host}/ws/v1?token={jwt}
```

`useWs()` держит одно соединение, поддерживает реконнект и подписку на каналы. Входящие события синхронизируются с кэшем TanStack Query.

| Channel | События | Экран |
|---------|---------|-------|
| `auction:{id}` | `bid.placed`, `auction.ended` | страница лота (таймер, история ставок) |
| `user:{id}` | `notification.new`, `balance.updated` | inbox, баланс в шапке |
| `forum:{topicId}` | `message.new`, `reaction.added`, `topic.promoted` | тема форума, чат *(Pro)* |

## 🔒 Безопасность и auth

- **Вход** через **Logto** (OIDC, Authorization Code + PKCE), SDK `@logto/vue`.
- JWT хранится и обновляется SDK; для API берётся `getAccessToken()`.
- Настройка Cloud / self-host: [logto-setup.md](./logto-setup.md).
- Router-guard'ы: `requireMember` (нет JWT → лендинг), `requireAuth`, проверка тарифа для Pro-фич (мягкая — UI показывает upgrade-подсказку, авторитетная проверка на бэке через [plan-config](../05-microservices/plan-config/README.md)).
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
| `VITE_LOGTO_ENDPOINT` | endpoint Logto (Cloud или self-host) | `https://<tenant>.logto.app` |
| `VITE_LOGTO_APP_ID` | ID SPA-приложения в Logto | `xxxxx` |
| `VITE_LOGTO_API_RESOURCE` | API resource identifier (audience JWT) | `https://api.tavrida-lot.ru` |
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

- [x] Скелет: router, pinia, TanStack Query, i18n в `main.ts`
- [x] Tailwind v4 + CSS tokens (`@tavrida/ui/styles`)
- [x] `UiButton` + CVA + `cn()` — паттерн компонентов
- [x] Reka UI primitives (Modal) + AppShell / layouts
- [x] REST mock adapter + fixtures (W02)
- [x] Routes + guards по [screen-tree](../11-ux-ui/screen-tree.md)
- [ ] `useWs()` + реестр каналов
- [x] Logto Cloud (`@logto/vue`, invite flow, guards) — [logto-setup.md](./logto-setup.md)
- [ ] Logto self-host + BFF JWT validation
- [ ] d3 viz: `ActivityHeatmap` (W07)
- [ ] Vitest + Playwright конфиги

## 🔗 Связанные разделы

- [platform-for-users](../01-goal/platform-for-users.md) — продукт для людей
- [11-ux-ui](../11-ux-ui/README.md) — wireframes, компоненты, дизайн
- [bff](../05-microservices/bff/README.md) — API/WS, к которому подключается фронт
- [06-api](../06-api/README.md) — контракт REST, ошибки, идемпотентность
- [ADR-002](../03-architecture/adr/002-bff-rest-wss.md) — REST + WebSocket
- [09-security](../09-security/README.md) — auth, Logto, RBAC

---

**Автор:** команда разработки · **Версия:** 0.2-spec

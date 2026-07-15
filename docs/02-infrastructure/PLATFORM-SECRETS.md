# 🔐 Реестр переменных окружения платформы

> **Статус:** draft · **Версия:** 0.1  
> **Назначение:** единый источник истины для **runtime-секретов** Tavrida Lot — локальная разработка, Bitwarden Secrets Manager, Docker Swarm.

**Шаблон для импорта:** [`.env.example`](../../.env.example) в корне репозитория.

**Не путать с:**
- [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) — бизнес-настройки (scalar-config / plan-config), хранятся в БД
- Этот документ — **инфраструктурные** переменные (DSN, API keys, URLs)

---

## 🎯 Как использовать

1. Скопировать `.env.example` → `.env.local` (в `.gitignore`, не коммитить).
2. В **Bitwarden Secrets Manager** создать проект `tavrida-lot` с окружениями `local` / `dev` / `prod`.
3. Занести секреты по секциям ниже (или импортировать `.env.example` как черновик).
4. При деплое — inject через Swarm secrets / CI, **не** хранить в git.

**Правило:** новая runtime-переменная → строка **здесь** + `.env.example` + краткая секция в README сервиса.

---

## 🌍 Окружения

| Env | Домены | Примечание |
|-----|--------|------------|
| `local` | `*.tavrida-lot.localhost` | `.env.local`, docker-compose |
| `dev` | `*.tl.dev.*` | отдельные ключи Novu/Sentry |
| `prod` | `*.tavrida-lot.ru` | ротация секретов, `NODE_ENV=production` |

---

## 🏗️ Платформа (общие для нескольких сервисов)

| Переменная | Секрет | Кто использует | Local default | Описание |
|------------|--------|----------------|---------------|----------|
| `NODE_ENV` | нет | все | `development` | `development` \| `production` \| `test` |
| `DATABASE_URL` | **да** | все с БД | `postgres://postgres:postgres@localhost:5432/tavrida_lot` | Единый DSN PostgreSQL ([ADR-001](../03-architecture/adr/001-database-schema-per-service.md)); schema задаётся в ormconfig сервиса |
| `DB_HOST` | нет | scaffold (ormconfig) | `localhost` | Альтернатива `DATABASE_URL` — для docker-compose; **в prod предпочтителен `DATABASE_URL`** |
| `DB_PORT` | нет | scaffold | `5432` | Порт PostgreSQL |
| `DB_USER` | **да** | scaffold | `postgres` | Пользователь БД |
| `DB_PASSWORD` | **да** | scaffold | `postgres` | Пароль БД |
| `DB_NAME` | нет | scaffold | `tavrida_lot` | Имя базы |
| `REDIS_URL` | **да** | bff, notifications, scalar-config, auction | `redis://localhost:6379` | Кэш, pub/sub WS relay |
| `RABBITMQ_URL` | **да** | billing, auction, feedback, rating, forum, marketplace, notifications | `amqp://guest:guest@localhost:5672` | Async events ([event-catalog](../03-architecture/event-catalog.md)) |
| `MINIO_ENDPOINT` | нет | auction, forum, user-profile, feedback, marketplace | `localhost` | S3-compatible endpoint |
| `MINIO_PORT` | нет | ↑ | `9000` | Порт MinIO |
| `MINIO_USE_SSL` | нет | ↑ | `false` | TLS к MinIO |
| `MINIO_ACCESS_KEY` | **да** | ↑ | `minioadmin` | Access key |
| `MINIO_SECRET_KEY` | **да** | ↑ | `minioadmin` | Secret key |
| `MINIO_URL` | нет | marketplace (legacy alias) | `http://localhost:9000` | Полный URL; предпочтительно `MINIO_ENDPOINT` + ключи |
| `LOGTO_ENDPOINT` | нет | bff, frontend | `https://logto.example.com` | OIDC issuer / Logto tenant URL |
| `LOGTO_JWKS_URL` | нет | bff | `{LOGTO_ENDPOINT}/oidc/jwks` | JWKS для валидации JWT |
| `LOGTO_AUDIENCE` | нет | bff | `https://api.tavrida-lot.localhost` | Expected `aud` в JWT |
| `LOGTO_M2M_APP_ID` | **да** | bff | — | M2M app для Management API (invites) |
| `LOGTO_M2M_APP_SECRET` | **да** | bff | — | M2M client secret |
| `LOGTO_M2M_RESOURCE` | нет | bff | `https://default.logto.app/api` | Management API resource |
| `LOGTO_WEBHOOK_SIGNING_KEY` | **да** (prod) | bff | — | HMAC key из Logto Console → Webhooks |
| `LOGTO_WEBHOOK_ENDPOINT_URL` | нет | setup script | — | Публичный URL для `pnpm setup:logto-webhook` |
| `KETO_READ_URL` | нет | bff, domain services | `http://localhost:4466` | Ory Keto read API |
| `KETO_WRITE_URL` | нет | bff, admin flows | `http://localhost:4467` | Ory Keto write API |
| `NOVU_API_KEY` | **да** | notifications | — | Secret key Novu Cloud ([ADR-004](../03-architecture/adr/004-notifications-adapter.md)) |
| `NOVU_API_URL` | нет | notifications | `https://api.novu.co` | API URL (self-host: свой endpoint) |
| `NOVU_APPLICATION_IDENTIFIER` | нет | notifications, frontend | — | Public app id для Inbox |
| `SENTRY_DSN` | **да** | все NestJS, опц. | — | Backend error tracking |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | нет | все NestJS | `http://localhost:4318` | OpenTelemetry collector |
| `OTEL_SERVICE_NAME` | нет | каждый сервис | имя сервиса | Идентификатор в трейсах |

---

## 🌐 BFF (`services/bff`) — порт 3000

| Переменная | Секрет | Default | Описание |
|------------|--------|---------|----------|
| `PORT` | нет | `3000` | HTTP + WS entrypoint |
| `LOGTO_JWKS_URL` | нет | см. платформа | JWT validation |
| `LOGTO_AUDIENCE` | нет | см. платформа | JWT audience |
| `LOGTO_M2M_APP_ID` | **да** | — | Logto Management API (invites) |
| `LOGTO_M2M_APP_SECRET` | **да** | — | M2M secret |
| `LOGTO_M2M_RESOURCE` | нет | `https://default.logto.app/api` | Management API resource |
| `FRONTEND_ORIGIN` | нет | `http://localhost:5173` | База invite links |
| `REDIS_URL` | **да** | см. платформа | WS pub/sub relay |
| `CORS_ORIGINS` | нет | `https://app.tavrida-lot.localhost` | Разрешённые origins (через запятую) |
| `BILLING_URL` | нет | `http://localhost:3001` | Upstream billing |
| `PLAN_CONFIG_URL` | нет | `http://localhost:3002` | Upstream plan-config |
| `AUCTION_URL` | нет | `http://localhost:3003` | Upstream auction |
| `SUBSCRIPTIONS_URL` | нет | `http://localhost:3004` | Upstream subscriptions (legacy: `AUCTION_SUBSCRIPTIONS_URL`) |
| `RATING_URL` | нет | `http://localhost:3005` | Upstream rating |
| `FEEDBACK_URL` | нет | `http://localhost:3006` | Upstream feedback |
| `USER_PROFILE_URL` | нет | `http://localhost:3007` | Upstream user-profile |
| `SCALAR_CONFIG_URL` | нет | `http://localhost:3008` | Upstream settings |
| `FORUM_URL` | нет | `http://localhost:3009` | Upstream forum |
| `NOTIFICATIONS_URL` | нет | `http://localhost:3010` | Upstream notifications |
| `INTERNAL_SERVICE_TOKEN` | нет* | — | Bearer к `notifications` / `subscriptions` `/internal/v1/*` (пусто = open) |
| `MARKETPLACE_URL` | нет | `http://localhost:3011` | Upstream marketplace |
| `PERIODS_URL` | нет | `http://localhost:3014` | Upstream periods (исторический справочник) |
| `KETO_READ_URL` | нет | `http://localhost:4466` | Keto read API — admin check (invites quota) |
| `KETO_NAMESPACE` | нет | `TavridaLot` | Keto namespace |
| `KETO_PLATFORM_OBJECT` | нет | `platform:tavrida-lot` | Platform object id |
| `KETO_ADMIN_RELATION` | нет | `admin` | Admin relation name |
| `CLUB_INVITE_VALIDITY_DAYS` | нет | `14` | **Deprecated** — fallback если settings недоступен; primary: `club.invite.validityDays` (admin `/admin/settings`) |
| `CLUB_INVITES_PER_MONTH` | нет | `10` | **Deprecated** — fallback если plan-config недоступен; primary: `club.member.invite.monthlyMax` |
| `CLUB_INVITES_UNLIMITED_ISSUER_IDS` | нет | — | CSV Logto `sub` без лимита (fallback без Keto) |

> В README BFF указано `{SERVICE}_URL` — полный список зафиксирован здесь.

---

## 💰 billing (`services/billing`) — порт 3001

| Переменная | Секрет | Schema | Default | Описание |
|------------|--------|--------|---------|----------|
| `PORT` | нет | — | `3001` | HTTP |
| `DATABASE_URL` | **да** | `billing` | см. платформа | PostgreSQL |
| `RABBITMQ_URL` | **да** | — | см. платформа | Events: `billing.*` |
| `PLAN_CONFIG_URL` | нет | — | `http://localhost:3002` | Проверка тарифов |
| `SENTRY_DSN` | **да** | — | — | Опционально |

---

## 📋 plan-config (`services/plan-config`) — порт 3002

| Переменная | Секрет | Schema | Default | Описание |
|------------|--------|--------|---------|----------|
| `PORT` | нет | — | `3002` | HTTP |
| `DATABASE_URL` | **да** | `plan_config` | см. платформа | PostgreSQL |
| `BILLING_URL` | нет | — | `http://localhost:3001` | Списания / подписки |
| `SENTRY_DSN` | **да** | — | — | Опционально |

---

## 🔨 auction (`services/auction`) — порт 3003

| Переменная | Секрет | Schema | Default | Описание |
|------------|--------|--------|---------|----------|
| `PORT` | нет | — | `3003` | HTTP |
| `DATABASE_URL` | **да** | `auction` | см. платформа | PostgreSQL |
| `RABBITMQ_URL` | **да** | — | см. платформа | `auction.completed`, `bid.placed` |
| `REDIS_URL` | **да** | — | см. платформа | Live bids cache |
| `PLAN_CONFIG_URL` | нет | — | `http://localhost:3002` | Лимиты / фичи |
| `BILLING_URL` | нет | — | `http://localhost:3001` | Платные фичи (promotion) |
| `RATING_URL` | нет | — | `http://localhost:3005` | Проверка бана |
| `MINIO_*` | см. платформа | bucket `auction-images` | — | Фото лотов |
| `SENTRY_DSN` | **да** | — | — | Опционально |

---

## 🔔 subscriptions (`services/subscriptions`) — порт 3004

| Переменная | Секрет | Schema | Default | Описание |
|------------|--------|--------|---------|----------|
| `PORT` / `SUBSCRIPTIONS_PORT` | нет | — | `3004` | HTTP |
| `DATABASE_URL` | **да** | `subscriptions` | см. платформа | PostgreSQL |
| `RABBITMQ_URL` | **да** | — | см. платформа | События (fan-out later) |
| `PLAN_CONFIG_URL` | нет | — | `http://localhost:3002` | Лимиты (check via BFF) |
| `NOTIFICATIONS_URL` | нет | — | `http://localhost:3010` | Триггер уведомлений (later) |
| `SENTRY_DSN` | **да** | — | — | Опционально |

---

## ⭐ rating — порт 3005 _(docs, код позже)_

| Переменная | Секрет | Schema | Описание |
|------------|--------|--------|----------|
| `PORT` | нет | — | `3005` |
| `DATABASE_URL` | **да** | `rating` | PostgreSQL |
| `RABBITMQ_URL` | **да** | — | `rating.updated`, `feedback.submitted` |
| `SCALAR_CONFIG_URL` | нет | — | Параметры формулы рейтинга |

---

## 💬 deal-feedback — порт 3006

| Переменная | Секрет | Schema | Описание |
|------------|--------|--------|----------|
| `PORT` / `DEAL_FEEDBACK_PORT` | нет | — | `3006` |
| `DATABASE_URL` | **да** | `deal_feedback` | PostgreSQL |
| `RABBITMQ_URL` | **да*** | — | consume `marketplace.order_completed` |
| `USER_PROFILE_URL` | нет | — | Δrating на submit (`DEAL_FEEDBACK`) |
| `FEEDBACK_URL` / `DEAL_FEEDBACK_URL` | нет (BFF) | — | Upstream URL |

\*без URL consumer тихо отключается.

---

## 👤 user-profile — порт 3007 _(docs)_

| Переменная | Секрет | Schema | Описание |
|------------|--------|--------|----------|
| `PORT` | нет | — | `3007` |
| `DATABASE_URL` | **да** | `user_profile` | PostgreSQL |
| `RABBITMQ_URL` | **да** | — | Sync rating cache |
| `MINIO_*` | **да** | bucket `avatars` | Аватары |

---

## ⚙️ scalar-config — порт 3008 _(docs)_

| Переменная | Секрет | Schema | Описание |
|------------|--------|--------|----------|
| `PORT` | нет | — | `3008` |
| `DATABASE_URL` | **да** | `scalar-config` | PostgreSQL |
| `REDIS_URL` | **да** | — | Кэш `settings:{domain}:latest` |

---

## 🗣️ forum — порт 3009 _(docs)_

| Переменная | Секрет | Schema | Описание |
|------------|--------|--------|----------|
| `PORT` | нет | — | `3009` |
| `DATABASE_URL` | **да** | `forum` | PostgreSQL |
| `RABBITMQ_URL` | **да** | — | Realtime events |
| `REDIS_URL` | **да** | — | Опционально |
| `MINIO_*` | **да** | bucket `forum-attachments` | Вложения |
| `KETO_READ_URL` | нет | — | Права модерации |

---

## ⏳ periods — порт 3014

| Переменная | Секрет | Schema | Описание |
|------------|--------|--------|---------|
| `PORT` / `PERIODS_PORT` | нет | — | `3014` |
| `DATABASE_URL` | **да** | `periods` | PostgreSQL |

---

## 📬 notifications — порт 3010

| Переменная | Секрет | Schema | Описание |
|------------|--------|--------|----------|
| `PORT` / `NOTIFICATIONS_PORT` | нет | — | `3010` |
| `DATABASE_URL` | **да** | `notifications` | Audit log + subscribers |
| `REDIS_URL` | нет* | — | Pub/sub → BFF *(next)* |
| `NOVU_API_KEY` | нет* | — | Novu secret; без ключа — **mock** trigger |
| `NOVU_APPLICATION_IDENTIFIER` | нет | — | Public id |
| `NOVU_API_URL` | нет | — | default `https://api.novu.co` |
| `INTERNAL_SERVICE_TOKEN` | нет* | — | Shared Bearer for `/internal/v1/*`; empty = open (dev) |
| `RABBITMQ_URL` | нет* | — | Consume domain events *(next)* |

---

## 🛒 marketplace — порт 3011

| Переменная | Секрет | Schema | Описание |
|------------|--------|--------|----------|
| `PORT` / `MARKETPLACE_PORT` | нет | — | `3011` |
| `DATABASE_URL` | **да** | `marketplace` | PostgreSQL |
| `RABBITMQ_URL` | нет* | — | Order events *(next)* |

---

## 🖥️ Frontend (`apps/frontend`)

Переменные с префиксом `VITE_` **попадают в клиентский бандл** — не класть секреты.

| Переменная | Секрет | Public | Описание |
|------------|--------|--------|----------|
| `VITE_USE_MOCK` | нет | да | `true` — mock API/redeem; `false` — BFF |
| `VITE_API_BASE_URL` | нет | да | BFF REST, напр. `http://localhost:3000/api/v1` |
| `VITE_WS_URL` | нет | да | BFF WebSocket, напр. `ws://localhost:3000/ws/v1` |
| `VITE_LOGTO_ENDPOINT` | нет | да | Logto tenant URL |
| `VITE_LOGTO_APP_ID` | нет | да | Logto application id (SPA) |
| `VITE_LOGTO_API_RESOURCE` | нет | да | JWT audience для BFF (optional до BFF) |
| `VITE_NOVU_APPLICATION_IDENTIFIER` | нет | да | Novu Inbox (public) |
| `VITE_SENTRY_DSN` | нет | да* | Frontend Sentry (*DSN считается public в Sentry) |

---

## 📋 Чеклист Bitwarden (минимум для dev)

- [ ] `DATABASE_URL` (или `DB_USER` + `DB_PASSWORD`)
- [ ] `REDIS_URL`
- [ ] `RABBITMQ_URL`
- [ ] `MINIO_ACCESS_KEY` + `MINIO_SECRET_KEY`
- [ ] `LOGTO_*` (tenant dev)
- [ ] `NOVU_API_KEY` (Novu Development environment)
- [ ] `SENTRY_DSN` (backend + frontend projects)
- [ ] `KETO_READ_URL` / `KETO_WRITE_URL` (если Keto поднят)

---

## 🔗 Связанные разделы

- [`.env.example`](../../.env.example) — шаблон для копирования
- [Инфраструктура](./README.md)
- [Безопасность](../09-security/README.md)
- [10-data — schema matrix](../10-data/README.md)
- [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md)

---

**v0.1** · последнее обновление: 2026-07-07

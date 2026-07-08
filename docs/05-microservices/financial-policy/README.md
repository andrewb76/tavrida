# 📋 Сервис: financial-policy

> **Статус:** spec ready · **Версия:** 0.2 · **Schema:** `financial_policy`

## 🎯 Назначение

Единый сервис **тарифных планов**, **лимитов** и **фич** для Tavrida Lot.

- Планы Free / Basic / Pro и подписки пользователей
- Реестр параметров от domain-сервисов (`Parameter`, `PlanParameter`)
- API проверки лимитов и фич для BFF и internal callers
- Активация подписки с charge через billing
- CRON автопродления

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Plan** | Тариф (`free`, `basic`, `pro`) с ценами |
| **UserSubscription** | Активная подписка пользователя |
| **Parameter** | Зарегистрированный ключ лимита/фичи (`auction.activeAuctions`) |
| **PlanParameter** | Значение параметра для конкретного плана |
| **limit** | Числовой потолок; `∞` = без лимита |
| **feature** | Boolean-доступ к возможности |

## 🗄️ Сущности

### `Plan` (`financial_policy.plan`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | varchar PK | `free`, `basic`, `pro` |
| `title`, `description` | text | UI |
| `monthlyPrice`, `yearlyPrice` | decimal | ₽; `free` = 0 |
| `isActive` | boolean | Скрытие плана admin |

### `Parameter` (`financial_policy.parameter`)

| Поле | Тип | Описание |
|------|-----|----------|
| `key` | varchar unique | `auction.activeAuctions` |
| `service` | varchar | Домен-владелец |
| `name`, `description` | text | Admin UI |
| `valueType` | enum | `limit` \| `feature` \| `enum` |
| `minValue`, `defaultValue`, `maxValue` | int | Для limit |
| `isFeatureEnabled` | boolean | Мета (deprecated per plan — см. PlanParameter) |

### `PlanParameter` (`financial_policy.plan_parameter`)

| Поле | Тип | Описание |
|------|-----|----------|
| `planId` + `parameterKey` | composite PK | — |
| `limitValue` | int nullable | Для limit; `-1` = ∞ |
| `isFeatureEnabled` | boolean | Для feature |
| `enumValues` | jsonb nullable | Для enum (напр. типы аукциона) |

### `UserSubscription` (`financial_policy.user_subscription`)

| Поле | Тип | Описание |
|------|-----|----------|
| `userId` | UUID PK | — |
| `planId` | varchar | Текущий план |
| `startsAt`, `expiresAt` | timestamptz | Период |
| `autoRenew` | boolean | Автопродление |
| `status` | enum | `ACTIVE` \| `EXPIRED` \| `CANCELLED` |

## 🔌 API

### Public (BFF `/api/v1/plans/*`)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/plans` | Список активных планов (цены, features summary) |
| GET | `/plans/subscription` | Текущая подписка пользователя |
| POST | `/plans/activate` | Активация / смена плана |
| POST | `/plans/cancel-auto-renew` | Отключить автопродление |

### Internal (`/internal/v1/`)

| Method | Path | Caller | Описание |
|--------|------|--------|----------|
| POST | `/parameters/register` | domain services (startup) | Регистрация параметра |
| POST | `/limits/check` | auction, forum, BFF | Проверка лимита |
| POST | `/features/can-use` | auction, BFF | Проверка feature flag |
| GET | `/subscription?userId=` | BFF, domain | План пользователя |
| POST | `/features/set-limit` | admin-ui | Настройка PlanParameter |
| GET | `/health`, `/health/ready` | orchestrator | — |

### `POST /internal/v1/limits/check`

```json
{
  "userId": "user-uuid",
  "parameterKey": "auction.activeAuctions",
  "requestedValue": 1,
  "currentUsage": 4
}
```

```json
{
  "allowed": true,
  "planId": "basic",
  "limit": 20,
  "remaining": 16
}
```

403 / `allowed: false` — лимит исчерпан.

### `POST /internal/v1/features/can-use`

```json
{
  "userId": "user-uuid",
  "featureKey": "auction.promotionEnabled"
}
```

```json
{ "allowed": true, "planId": "pro" }
```

### `POST /api/v1/plans/activate` (public via BFF)

```json
{
  "planId": "pro",
  "autoRenew": true,
  "billingPeriod": "monthly"
}
```

**Flow:**

1. Resolve price (`monthlyPrice` / `yearlyPrice`)
2. `billing POST /internal/v1/wallets/charge` с `target: financial-policy.activate-plan:pro`
3. Upsert `UserSubscription` → `ACTIVE`, `expiresAt = now + period`
4. Produce `subscription.activated`

### Автопродление (CRON)

- Job каждый час: `expiresAt <= now()` AND `autoRenew = true` AND `status = ACTIVE`
- Charge → extend `expiresAt` или `subscription.expired` + `EXPIRED`

## ⚙️ Переменные settings

Не владеет settings — только financial-policy parameters.

## 💳 Переменные financial-policy

Сервис **владеет** значениями per plan. Параметры регистрируются доменными сервисами при старте.

Примеры: `auction.activeAuctions`, `forum.postsPerDay`, `auction_subscriptions.categoriesMax`.

> Полный реестр: [PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md)

## 📨 События

| Direction | Event | Когда |
|-----------|-------|-------|
| produce | `subscription.activated` | Успешная активация / смена плана |
| produce | `subscription.expired` | Истечение без продления |
| consume | `billing.charge_completed` | Подтверждение оплаты (optional reconcile) |
| consume | `billing.deposit_completed` | Retry auto-renew после пополнения |

> Каталог: [event-catalog](../../03-architecture/event-catalog.md)

## 🔗 Взаимодействие

| Сервис | Взаимодействие | Протокол |
|--------|---------------|----------|
| billing | balance, charge | HTTP internal |
| auction, forum, marketplace, auction-subscriptions | limits/check, features/can-use | HTTP internal |
| admin-ui | set-limit, plans CRUD | HTTP via BFF + Keto admin |
| notifications | subscription events | RabbitMQ |

## 🔒 Безопасность

- `/limits/check`, `/features/can-use` — service token или BFF (user context)
- `/features/set-limit`, `/parameters/register` — **admin only** (Keto)
- Публичный доступ только через BFF; прямой internet → financial-policy запрещён

## ⚙️ Окружение

| Переменная | Обяз. | Описание | Пример |
|------------|-------|----------|--------|
| `DATABASE_URL` | да | schema `financial_policy` | postgres://… |
| `BILLING_URL` | да | Internal billing | http://billing:3001 |
| `RABBITMQ_URL` | да | Events | amqp://… |
| `PORT` | нет | HTTP | `3002` |
| `SUBSCRIPTION_CRON_ENABLED` | нет | CRON autoprenew | `true` |

> [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md)

## 📎 Связанные разделы

- [billing](../billing/README.md)
- [PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md)
- [ADR-003](../../03-architecture/adr/003-settings-vs-financial-policy.md)
- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

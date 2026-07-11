# 📋 Сервис: plan-config

> **Статус:** v1 scaffold · **Версия:** 0.4 · **Schema:** `plan_config` · **Код:** `services/plan-config` :3002 · **billing:** wired ✅  
> **Legacy name:** financial-policy · [ADR-017](../../03-architecture/adr/017-plan-config-scalar-config-rename.md)

## 🎯 Назначение

Сервис **тарифных планов**, **подписок** и **хранилища матрицы** «Планы × Plan variables».

| Зона ответственности | Да | Нет |
|---------------------|----|-----|
| Планы (`free`, `basic`, `pro`) и цены подписки | ✅ | |
| Подписки пользователей, автопродление | ✅ | |
| Кэш `userId → planId` | ✅ | |
| Хранение и отдача значений зарегистрированных plan variables | ✅ | |
| Редактирование матрицы (admin via BFF) | ✅ | |
| `limits/check`, `features/can-use` | ✅ | |
| Resolve разовых цен (`valueType: price`) | ✅ | |
| Знание конкретных ключей в коде | | ❌ |
| Счётчики использования лимитов | | ❌ ([ADR-016](../../03-architecture/adr/016-financial-policy-parameter-registration.md)) |
| Семантика «что считать usage» | | ❌ — владелец domain-сервиса |

Plan variables попадают в БД **только** через sync/register от domain-сервисов при старте.  
Каталог проектирования: [PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md). Формат ключей: [registry-keys.md](../../13-maintenance/registry-keys.md).

> **Временный dev-bootstrap:** `services/plan-config/src/config/default-seed.ts` — до переноса seeds в domain-сервисы.

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Plan** | Тариф (`free`, `basic`, `pro`) с ценами |
| **UserSubscription** | Активная подписка пользователя |
| **Plan variable** | Строка в runtime-реестре после register/sync (legacy: parameter) |
| **syncStatus** | `active` — в текущем sync-манифесте; `stale` — сервис больше не передаёт ключ (legacy: `registrationStatus: orphaned`) |
| **PlanParameter** | Ячейка матрицы: значение plan variable для конкретного плана |
| **limit** | Числовой потолок; `−1` = без лимита |
| **feature** | Boolean-доступ |
| **enum** | Набор строк per plan |
| **price** | Разовая цена (₽) per plan — бывший `charge_target` |

## 🗄️ Сущности

### `Plan` (`plan_config.plan`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | varchar PK | `free`, `basic`, `pro` |
| `title`, `description` | text | UI |
| `monthlyPrice`, `yearlyPrice` | decimal | ₽; `free` = 0 |
| `isActive` | boolean | Скрытие плана admin |

### `PlanVariable` (`plan_config.plan_variable`)

| Поле | Тип | Описание |
|------|-----|----------|
| `key` | varchar unique | `auction.seller.lot.activeMax` |
| `service` | varchar | Домен-владелец |
| `name`, `description` | text | Admin UI |
| `valueType` | enum | `limit` \| `feature` \| `enum` \| `price` |
| `syncStatus` | varchar | `active` \| `stale` |

### `PlanParameter` (`plan_config.plan_parameter`)

| Поле | Тип | Описание |
|------|-----|----------|
| `planId` + `planVariableKey` | composite PK | — |
| `limitValue` | int nullable | Для limit; `-1` = ∞ |
| `isFeatureEnabled` | boolean | Для feature |
| `enumValues` | jsonb nullable | Для enum |
| `priceAmount` | decimal nullable | Для price (₽) |

### `UserSubscription` (`plan_config.user_subscription`)

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
| GET | `/plans` | Список активных планов |
| GET | `/plans/subscription` | Текущая подписка пользователя |
| POST | `/plans/activate` | Активация / смена плана |
| POST | `/plans/cancel-auto-renew` | Отключить автопродление |

### Internal (`/internal/v1/`)

| Method | Path | Caller | Описание |
|--------|------|--------|----------|
| POST | `/plan-variables/register` | domain @ startup | Один ключ (alias: `/parameters/register`) |
| POST | `/plan-variables/sync` | domain @ startup | Полный манифест; stale для отсутствующих |
| DELETE | `/plan-variables/:key` | admin via BFF | Удаление stale plan variable |
| GET | `/charges/resolve?key=` | auction, forum, billing | Цена по plan user (`valueType: price`) |
| POST | `/limits/check` | domain, BFF | Проверка лимита |
| POST | `/features/can-use` | domain, BFF | Проверка feature |
| GET | `/subscription?userId=` | BFF, domain | План пользователя |
| GET | `/health`, `/health/ready` | orchestrator | — |

### `POST /internal/v1/limits/check`

```json
{
  "userId": "user-uuid",
  "planVariableKey": "auction.bidder.participation.activeMax",
  "requestedValue": 1,
  "currentUsage": 4
}
```

Caller передаёт `currentUsage` — plan-config **не считает** usage сам.

## ⚙️ Scalar config

Не владеет scalar keys — см. [scalar-config README](../scalar-config/README.md).

## 💳 Plan variables (регистрация)

Сервис **не объявляет** доменные ключи. Регистрация — domain-сервис:

```http
POST /internal/v1/plan-variables/sync
```

Пример владельца: [auction/requirements/financial-features.md](../auction/requirements/financial-features.md).

## 📨 События

| Direction | Event | Когда |
|-----------|-------|-------|
| produce | `subscription.activated` | Успешная активация / смена плана |
| produce | `subscription.expired` | Истечение без продления |
| consume | `billing.charge_completed` | Reconcile оплаты |

## 🔗 Взаимодействие

| Сервис | Взаимодействие |
|--------|---------------|
| billing | balance, charge |
| auction, forum, marketplace, subscriptions | limits/check, features/can-use, charges/resolve |
| admin-ui | matrix CRUD via BFF + Keto |

## ⚙️ Окружение

| Переменная | Обяз. | Описание | Пример |
|------------|-------|----------|--------|
| `DATABASE_URL` | да | schema `plan_config` | postgres://… |
| `BILLING_URL` | да | Internal billing | http://billing:3001 |
| `RABBITMQ_URL` | да | Events | amqp://… |
| `PLAN_CONFIG_PORT` / `PORT` | нет | HTTP | `3002` |

> BFF: `PLAN_CONFIG_URL=http://localhost:3002` · [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md)

## 📎 Связанные разделы

- [scalar-config](../scalar-config/README.md)
- [PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md)
- [registry-keys.md](../../13-maintenance/registry-keys.md)
- [ADR-003](../../03-architecture/adr/003-settings-vs-financial-policy.md)
- [ADR-016](../../03-architecture/adr/016-financial-policy-parameter-registration.md)
- [ADR-017](../../03-architecture/adr/017-plan-config-scalar-config-rename.md)

---

**Автор:** команда разработки · **Версия:** 0.4-spec

# 🔑 Правила ключей PLATFORM-REGISTRY

> **Статус:** accepted · **Версия:** 0.1 · **Дата:** 2026-07-11  
> **Связано:** [naming.md](./naming.md) · [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) · [ADR-003](../03-architecture/adr/003-settings-vs-financial-policy.md) · [ADR-017](../03-architecture/adr/017-plan-config-scalar-config-rename.md)

Единые правила имён для двух реестров конфигурации платформы.

---

## Два реестра

| Реестр | Сервис | Schema PG | Значений на ключ | Назначение |
|--------|--------|-----------|------------------|------------|
| **Scalar config** | `scalar-config` | `scalar_config` | **1** (global или per-user) | Формулы, дефолты, списки — **не зависят от тарифа** |
| **Plan config** | `plan-config` | `plan_config` | **N** (по одному на каждый plan: free, basic, pro) | Лимиты, фичи, enum и **цены разовых списаний** per plan |

Ключ **не может** существовать в обоих реестрах одновременно.

---

## Общий формат ключа

```
{domain}.{segment}….{leafName}
```

| Часть | Правило |
|-------|---------|
| **domain** | snake_case домена / schema без дефисов: `auction`, `forum`, `rating`, `subscriptions` |
| **сегменты** | camelCase, только `[a-zA-Z0-9]`; **точка** — разделитель уровней |
| **leafName** | Семантическое имя свойства: `activeMax`, `enabled`, `unitPrice`, `allowed` |
| **Дефисы** | ❌ Запрещены в ключе (в т.ч. в prefix) |

---

## Scalar config — скалярные ключи

**Минимум 2 сегмента:** `{domain}.{name}` или `{domain}.{group}.{name}`.

Рекомендуется **3+ сегмента** для вложенных групп — единообразие с plan variables и удобство admin UI.

| Пример | Описание |
|--------|----------|
| `rating.authorityExponent` | 2 сегмента — допустимо для простых scalar |
| `rating.bonus.earlyHours` | 3 сегмента — предпочтительно для групп |
| `club.registration.inviteOnly` | boolean, global scope |
| `auction.bid.incrementDefault` | дефолт шага ставки (₽), не per plan |

**Не хранить здесь:** лимиты по тарифу, feature gates per plan, разовые цены.

---

## Plan config — plan variables

**Минимум 3 сегмента.** Каждый ключ — **plan variable** (ранее «parameter»).

```
{domain}.{facet}.{orderedGroup}.{leafName}
```

### Facet (роль / сторона)

Сегмент после domain, когда лимит или фича **зависит от роли** пользователя в домене:

| Facet | Домен | Смысл |
|-------|-------|-------|
| `seller` | auction | Продавец лота |
| `bidder` | auction | Участник торгов (ставки) |
| `author` | forum | Автор тем / постов |
| `member` | subscriptions, club | Участник клуба (нейтральная роль) |
| `reaction` | forum | Платные реакции (цена = `price`) |

Если роль не применима (например, `referralRewards.payoutMultiplier`) — facet опускается, но **всё равно ≥3 сегмента**:

```
referralRewards.program.enabled
referralRewards.earning.monthlyMax
```

### Numeric ordering prefix

Третий сегмент (или групповой) начинается с **двузначного числового префикса** для сортировки в admin UI:

| Префикс | Пример | Зачем |
|---------|--------|-------|
| `01…` | `auction.seller.01lot.activeMax` | Первая группа seller/lot |
| `02…` | `auction.seller.02lot.dailyCreateMax` | Вторая группа seller |
| `08…` | `auction.seller.08promotion.unitPrice` | Разовая цена (price) |

Правила:

- Префикс **01–99** в начале группового сегмента (`01lot`, `02bid`, `03auctionTypes`).
- Порядок отражает логику onboarding в admin (лимиты → фичи → цены).
- При добавлении новой переменной — выбрать свободный номер в facet, **не переиспользовать** удалённые без миграции docs.

### Примеры auction (canonical)

| Ключ | valueType | Free / Basic / Pro | Было (legacy) |
|------|-----------|-------------------|---------------|
| `auction.seller.01lot.activeMax` | limit | 2 / 5 / ∞ | `auction.sellerActiveLots` |
| `auction.seller.02lot.dailyCreateMax` | limit | 3 / 10 / ∞ | `auction.auctionsCreatedPerDay` |
| `auction.seller.03lot.durationMaxHours` | limit | 72 / 336 / ∞ | `auction.auctionDurationMaxHours` |
| `auction.bidder.01participation.activeMax` | limit | 5 / 20 / ∞ | `auction.activeAuctions` |
| `auction.bidder.02bid.hourlyMax` | limit | 20 / 100 / ∞ | `auction.bidsPerHour` |
| `auction.seller.04promotion.enabled` | feature | false / false / true | `auction.promotionEnabled` |
| `auction.seller.05reservePrice.enabled` | feature | false / false / true | `auction.reservePriceEnabled` |
| `auction.seller.06durationPreset.customEnabled` | feature | false / false / true | `auction.customDurationPresets` |
| `auction.seller.07analytics.dashboardEnabled` | feature | false / false / true | `auction.analyticsDashboard` |
| `auction.bidder.03auctionTypes.allowed` | enum | `ENGLISH` / `ENGLISH,DUTCH` / `all` | `auction.auctionTypes` |
| `auction.seller.08promotion.unitPrice` | **price** | — / — / 200 ₽ | charge `auction.promotion` |
| `auction.seller.09reservePrice.unitPrice` | **price** | — / — / 100 ₽ | charge `auction.reservePrice` |
| `auction.seller.10durationPreset.unitPrice` | **price** | — / — / 50 ₽ | charge `auction.customDurationPreset` |

> **∞** в матрице = `limitValue: -1`.

---

## valueType (plan variables)

| valueType | PlanParameter | Проверка / использование |
|-----------|---------------|---------------------------|
| `limit` | `limitValue` (int; `-1` = без лимита) | `POST /limits/check` + `currentUsage` от domain |
| `feature` | `isFeatureEnabled` (boolean) | `POST /features/can-use` |
| `enum` | `enumValues` (jsonb string[]) | allow-list значений per plan |
| `price` | `priceAmount` (decimal, ₽) | `GET /charges/resolve?key=` → billing.charge |

**`price` заменяет** отдельную сущность `charge_target` + `plan_charge_price`. Одна plan variable = одна разовая услуга; цена **может отличаться по plan** (например, скидка Pro).

---

## Sync lifecycle (оба реестра)

Domain-сервис при старте отправляет **полный манифест** своих ключей.

| Поле | Значение | Описание |
|------|----------|----------|
| `syncStatus` | `active` | Ключ в текущем манифесте владельца |
| `syncStatus` | `stale` | Ключ был зарегистрирован ранее, но **отсутствует** в последнем sync |

> **Legacy:** `registrationStatus: orphaned` → **`syncStatus: stale`** ([ADR-017](../03-architecture/adr/017-plan-config-scalar-config-rename.md)).

### Правила sync

1. **Upsert** метаданных и дефолтов при первой регистрации.
2. **Не перезаписывать** admin-значения при повторном sync.
3. Ключи владельца, **отсутствующие** в манифесте → `syncStatus: stale` (не удалять автоматически).
4. **Автоудаление запрещено.** Admin удаляет stale ключи вручную после проверки.
5. `limits/check` для stale-ключа **действует**, пока ключ не удалён (обратная совместимость rollback).

### Endpoints

| Реестр | Sync | Register (single) |
|--------|------|-------------------|
| plan-config | `POST /internal/v1/plan-variables/sync` | `POST /internal/v1/plan-variables/register` |
| scalar-config | `POST /internal/v1/scalar-variables/sync` | `POST /internal/v1/scalar-variables/register` |

---

## Каталог vs runtime

| | PLATFORM-REGISTRY (docs) | `plan_config.plan_variable` / `scalar_config.scalar_variable` |
|--|--------------------------|-------------------------------------------------------------|
| Назначение | Проектирование, Oracle, PM | Production |
| Появление ключа | При описании фичи | Когда domain-сервис вызвал sync |
| Строка в каталоге | Не гарантирует наличие в БД | — |

---

## Чеклист: новая переменная

1. Выбрать реестр: scalar vs plan ([ADR-003](../03-architecture/adr/003-settings-vs-financial-policy.md)).
2. Собрать ключ по правилам выше (facet, numeric prefix для plan).
3. Добавить строку в [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md).
4. Добавить в sync-манифест владельца (`config/plan-variables.ts` или `config/scalar-keys.ts`).
5. Секция ⚙️ / 💳 в README domain-сервиса.

---

## Legacy → canonical (ключи и термины)

| Legacy | Canonical |
|--------|-----------|
| `settings` / `financial-policy` | `scalar-config` / `plan-config` |
| `parameter`, `Parameter` | **plan variable** |
| `registrationStatus: orphaned` | `syncStatus: stale` |
| `charge_target` + `plan_charge_price` | plan variable `valueType: price` |
| `auction.activeAuctions` | `auction.bidder.01participation.activeMax` |
| `auction.sellerActiveLots` | `auction.seller.01lot.activeMax` |
| `auction.promotion` (charge target) | `auction.seller.08promotion.unitPrice` |

---

## 🔗 Связанные документы

- [naming.md](./naming.md) — общие соглашения repo/docs/PG
- [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) — полный каталог
- [plan-config README](../05-microservices/plan-config/README.md)
- [scalar-config README](../05-microservices/scalar-config/README.md)
- [ADR-016](../03-architecture/adr/016-financial-policy-parameter-registration.md) — регистрация plan variables
- [ADR-017](../03-architecture/adr/017-plan-config-scalar-config-rename.md) — переименование сервисов и ключей

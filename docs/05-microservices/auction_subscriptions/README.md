# 🔔 Сервис: auction-subscriptions

> **Статус:** spec ready · **Версия:** 0.2 · **Schema:** `auction_subscriptions`  
> **Docs path (legacy):** каталог `auction_subscriptions/` → целевой `auction-subscriptions/`

## 🎯 Назначение

**Подписки** пользователей на категории аукционов и конкретные лоты.

- Уведомления о новых лотах в категории (digest / instant)
- Отслеживание ставок в избранных аукционах
- Лимиты через financial-policy (`auction_subscriptions.*`)

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Subscription** | Подписка на `categoryId` или `auctionId` |
| **DigestPreference** | Email/push cadence per user |
| **Target type** | `CATEGORY` \| `AUCTION` |

## 🗄️ Сущности

### `Subscription` (`auction_subscriptions.subscription`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `userId` | UUID | Подписчик |
| `targetType` | enum | `CATEGORY` \| `AUCTION` |
| `categoryId` | UUID nullable | — |
| `auctionId` | UUID nullable | — |
| `notifyOnNewBid` | boolean | Для AUCTION |
| `notifyOnNewLot` | boolean | Для CATEGORY |
| `createdAt` | timestamptz | — |

Unique: `(userId, targetType, categoryId|auctionId)`.

### `DigestPreference` (`auction_subscriptions.digest_preference`)

| Поле | Тип | Описание |
|------|-----|----------|
| `userId` | UUID PK | — |
| `emailDigestEnabled` | boolean | Pro feature via FP |
| `pushEnabled` | boolean | — |
| `digestFrequency` | enum | `DAILY` \| `WEEKLY` |

## 🔌 API

### Public (BFF `/api/v1/auction-subscriptions/*`)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/auction-subscriptions` | Список подписок user |
| POST | `/auction-subscriptions` | Создать (check limits) |
| DELETE | `/auction-subscriptions/{id}` | Отписаться |
| PATCH | `/auction-subscriptions/digest` | Digest preferences |

### `POST /api/v1/auction-subscriptions`

```json
{
  "targetType": "CATEGORY",
  "categoryId": "uuid",
  "notifyOnNewLot": true
}
```

**Pre-check:** `financial-policy` → `auction_subscriptions.categoriesMax` or `auctionsMax`.

### Internal

| Method | Path | Описание |
|--------|------|----------|
| GET | `/internal/v1/subscriptions/by-target` | notifications fan-out |
| GET | `/health`, `/health/ready` | — |

## ⚙️ Переменные settings

Не владеет; digest hour — `notifications.digestHourUtc`.

## 💳 Переменные financial-policy

| Ключ | Free | Basic | Pro | Описание |
|------|------|-------|-----|----------|
| `auction_subscriptions.categoriesMax` | 3 | 10 | ∞ | Подписок на категории |
| `auction_subscriptions.auctionsMax` | 5 | 20 | ∞ | Подписок на лоты |

> Prefix **snake_case** — [naming.md](../../13-maintenance/naming.md)

## 📨 События

| Direction | Event | Действие |
|-----------|-------|----------|
| consume | `auction.created` | Notify category subscribers |
| consume | `auction.bid_placed` | Notify auction subscribers (if flag) |
| consume | `auction.completed` | Optional cleanup |

HTTP trigger → notifications `auction-subscription-digest` (scheduled).

## 🔗 Взаимодействие

| Сервис | Протокол |
|--------|----------|
| financial-policy | limits/check |
| auction | RMQ events |
| notifications | HTTP trigger, digest |
| BFF | public CRUD |

## 🔒 Безопасность

- CRUD — только `userId === jwt.sub`
- Internal by-target — service token

## ⚙️ Окружение

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `DATABASE_URL` | да | schema `auction_subscriptions` |
| `RABBITMQ_URL` | да | Consumers |
| `FINANCIAL_POLICY_URL` | да | Limits |
| `NOTIFICATIONS_URL` | да | Triggers |
| `PORT` | нет | default `3004` |

> [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md)

## 📎 Связанные разделы

- [auction](../auction/README.md)
- [notifications](../notifications/README.md)
- [PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

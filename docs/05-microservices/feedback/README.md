# 💬 Сервис: feedback

> **Статус:** spec ready · **Версия:** 0.2 · **Schema:** `feedback`

## 🎯 Назначение

**Отзывы о завершённых сделках** (аукцион и marketplace): сбор, напоминания, бонусы через rating.

- `DealFeedback` — финальные оценки сторон
- `PendingFeedback` — трекинг неоценённых сделок + CRON reminders
- Триггер `feedback.submitted` → rating, user-profile cache

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **DealFeedback** | Отзыв с оценками и комментариями обеих сторон |
| **PendingFeedback** | Ожидание отзыва от одного участника |
| **FeedbackBonus** | Audit начисленных бонусов (идемпотентность) |
| **dealType** | `auction` \| `marketplace` |

## 🗄️ Сущности

### `DealFeedback` (`feedback.deal_feedback`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `dealType` | enum | `auction` \| `marketplace` |
| `auctionId` / `orderId` | UUID nullable | Одно из двух |
| `sellerId`, `buyerId` | UUID | auction: seller/buyer; marketplace: provider/customer |
| `sellerRating`, `buyerRating` | decimal nullable | 1–5 |
| `sellerComment`, `buyerComment` | text nullable | — |
| `submittedBySellerAt`, `submittedByBuyerAt` | timestamptz nullable | — |
| `finalisedAt` | timestamptz nullable | Обе стороны или timeout |

### `PendingFeedback` (`feedback.pending_feedback`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `dealType`, `auctionId`/`orderId` | — | Ссылка на сделку |
| `userId` | UUID | Кому нужен отзыв |
| `notificationSentAt` | timestamptz | Первое уведомление |
| `remindersCount` | int | Счётчик напоминаний |
| `lastReminderAt` | timestamptz nullable | — |

### `FeedbackBonus` (`feedback.feedback_bonus`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `userId` | UUID | — |
| `type` | enum | `EARLY` \| `PHOTO` \| `BOTH` |
| `amount` | decimal | — |
| `referenceId` | UUID | dealFeedback id |
| `appliedAt` | timestamptz | — |

## 🔌 API

### Public (BFF `/api/v1/feedback/*`)

| Method | Path | Описание |
|--------|------|----------|
| POST | `/feedback/submit` | Частичный или полный отзыв стороны |
| GET | `/feedback/status` | Статус по `dealType` + `auctionId`/`orderId` |
| GET | `/feedback/pending` | Список pending для текущего user |

### `POST /api/v1/feedback/submit`

**Auction:**

```json
{
  "dealType": "auction",
  "auctionId": "uuid",
  "sellerGoodsReceived": true,
  "buyerPaymentReceived": true,
  "sellerRating": 5,
  "buyerRating": 4,
  "sellerComment": "Отличный товар",
  "buyerComment": "Честный продавец",
  "attachments": ["https://…"]
}
```

**Marketplace:**

```json
{
  "dealType": "marketplace",
  "orderId": "uuid",
  "providerServiceDelivered": true,
  "customerPaymentReceived": true,
  "providerRating": 5,
  "customerRating": 4
}
```

→ `200` + optional bonuses via `rating POST /bonuses/apply`

### Internal

| Method | Path | Описание |
|--------|------|----------|
| POST | `/internal/v1/feedback/pending/create` | Из event consumer |
| POST | `/internal/v1/feedback/reminders/run` | CRON |
| GET | `/health`, `/health/ready` | — |

## ⚙️ Переменные settings

| Ключ | Default | Описание |
|------|---------|----------|
| `notifications.feedbackReminderDays` | [1, 3, 7] | Интервалы напоминаний (via notifications) |

Бонусы — ключи `rating.bonuses.*` (settings, домен rating).

## 💳 Переменные financial-policy

Не применимо напрямую; лимиты pending — `rating.maxPendingBeforePenalty`.

## 📨 События

| Direction | Event | Когда |
|-----------|-------|-------|
| consume | `auction.completed` | PendingFeedback ×2 |
| consume | `marketplace.order_completed` | PendingFeedback ×2 |
| produce | `feedback.submitted` | Finalised deal |
| produce | `feedback.reminder_due` | CRON → notifications |

## 🔗 Взаимодействие

| Сервис | Протокол |
|--------|----------|
| auction, marketplace | RMQ completed events |
| rating | HTTP bonuses/apply, votes |
| notifications | HTTP trigger / RMQ reminder_due |
| user-profile | consume feedback.submitted |

## 🔒 Безопасность

- Submit — только участник сделки (seller/buyer или provider/customer)
- Нельзя оценить свою же сторону дважды с другим payload (409)
- Attachments — MinIO bucket `feedback-media`, virus scan TBD

## ⚙️ Окружение

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `DATABASE_URL` | да | schema `feedback` |
| `RABBITMQ_URL` | да | Events |
| `RATING_URL` | да | Bonuses |
| `NOTIFICATIONS_URL` | да | Reminders |
| `MINIO_*` | нет | feedback-media |
| `PORT` | нет | HTTP |

> [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md)

## 📎 Связанные разделы

- [rating](../rating/README.md)
- [auction](../auction/README.md)
- [marketplace](../marketplace/README.md)
- [Event catalog](../../03-architecture/event-catalog.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

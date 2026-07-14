# 💬 Сервис: deal-feedback

> **Статус:** implementing (v1) · **Версия:** 0.4 · **Schema:** `deal_feedback` · **Port:** 3006  
> **Код:** `services/deal-feedback` (`@tavrida/deal-feedback`)  
> **ADR:** [006-service-renames](../../03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md)  
> **Legacy:** каталог `feedback/` и schema `feedback` — deprecated

## ✅ Реализовано (v1)

| Слой | Статус |
|------|--------|
| Pending create (HTTP + RMQ `marketplace.order_completed`) | ✅ |
| Submit rating → user-profile `DEAL_FEEDBACK` log | ✅ |
| BFF `/api/v1/deal-feedback/*` | ✅ |
| Auction.completed consumer handler | ⏳ bind only |
| Reminder CRON / notifications | ⏳ |


**Отзывы о завершённых сделках** (аукцион и marketplace): сбор, напоминания, бонусы через rating.

- `DealFeedback` — финальные оценки сторон
- `PendingDealFeedback` — трекинг неоценённых сделок + CRON reminders
- Триггер `deal_feedback.submitted` → rating, user-profile cache

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **DealFeedback** | Отзыв с оценками и комментариями обеих сторон |
| **PendingDealFeedback** | Ожидание отзыва от одного участника |
| **DealFeedbackBonus** | Audit начисленных бонусов (идемпотентность) |
| **dealType** | `auction` \| `marketplace` |

## 🗄️ Сущности

### `DealFeedback` (`deal_feedback.deal_feedback`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `dealType` | enum | `auction` \| `marketplace` |
| `auctionId` / `orderId` | UUID nullable | Одно из двух |
| `sellerId`, `buyerId` | UUID | auction: seller/buyer; marketplace: provider/customer |
| `sellerRating`, `buyerRating` | decimal nullable | 1–5 |
| `sellerComment`, `buyerComment` | text nullable | Markdown plain text |
| `submittedBySellerAt`, `submittedByBuyerAt` | timestamptz nullable | — |
| `finalisedAt` | timestamptz nullable | Обе стороны или timeout |

### `PendingDealFeedback` (`deal_feedback.pending_deal_feedback`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `dealType`, `auctionId`/`orderId` | — | Ссылка на сделку |
| `userId` | UUID | Кому нужен отзыв |
| `notificationSentAt` | timestamptz | Первое уведомление |
| `remindersCount` | int | Счётчик напоминаний |
| `lastReminderAt` | timestamptz nullable | — |

## 🔌 API

### Public (BFF `/api/v1/deal-feedback/*`)

| Method | Path | Описание |
|--------|------|----------|
| POST | `/deal-feedback/submit` | Частичный или полный отзыв стороны |
| GET | `/deal-feedback/status` | Статус по `dealType` + id сделки |
| GET | `/deal-feedback/pending` | Список pending для текущего user |

> **Deprecated alias:** `/api/v1/feedback/*` — 1 релиз.

### Internal

| Method | Path | Описание |
|--------|------|----------|
| POST | `/internal/v1/deal-feedback/pending/create` | Из event consumer |
| POST | `/internal/v1/deal-feedback/reminders/run` | CRON |

## 📨 События

| Direction | Event | Когда |
|-----------|-------|-------|
| consume | `auction.completed` | Pending ×2 |
| consume | `marketplace.order_completed` | Pending ×2 |
| produce | `deal_feedback.submitted` | Finalised deal |
| produce | `deal_feedback.reminder_due` | CRON → notifications |

> Legacy consumer alias: `feedback.submitted` → `deal_feedback.submitted`

## 🔗 Взаимодействие

| Сервис | Протокол |
|--------|----------|
| auction, marketplace | RMQ completed events |
| rating | HTTP bonuses/apply, votes |
| notifications | reminders |
| user-profile | cache update |

## 📎 Связанные разделы

- [rating](../rating/README.md)
- [ADR-006](../../03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md)
- [Event catalog](../../03-architecture/event-catalog.md)

---

**Автор:** команда разработки · **Версия:** 0.3-spec

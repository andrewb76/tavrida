# 📨 Каталог событий (Event Catalog)

> **Exchange:** `tavrida-lot.events` (topic) · **Формат:** JSON · **Version:** envelope v1

## 📦 Envelope (общий для всех событий)

```json
{
  "eventId": "uuid-v4",
  "eventType": "auction.completed",
  "eventVersion": "1",
  "timestamp": "2026-07-06T12:00:00Z",
  "producer": "auction",
  "correlationId": "request-uuid",
  "payload": { }
}
```

## 📋 Соглашения

| Правило | Значение |
|---------|----------|
| Именование | `{domain}.{action}` — past tense: `auction.completed` |
| Legacy | `AUCTION.COMPLETED` → **deprecated**, использовать `auction.completed` |
| Idempotency | Consumer хранит `eventId`, повторная обработка — no-op |
| DLQ | `{queue-name}.dlq` после 3 retries |
| Routing key | = `eventType` |

---

## 🔨 auction

### `auction.created`

| | |
|---|---|
| **Producer** | auction |
| **Consumers** | auction-subscriptions (опционально) |
| **Payload** | |

```json
{
  "auctionId": "uuid",
  "sellerId": "uuid",
  "categoryId": "uuid",
  "type": "ENGLISH",
  "startsAt": "ISO8601",
  "endsAt": "ISO8601"
}
```

### `auction.bid_placed`

| | |
|---|---|
| **Producer** | auction |
| **Consumers** | BFF (Redis pub/sub → WS), notifications |
| **Payload** | |

```json
{
  "auctionId": "uuid",
  "bidId": "uuid",
  "bidderId": "uuid",
  "amount": 1500,
  "currency": "RUB",
  "placedAt": "ISO8601"
}
```

### `auction.completed`

| | |
|---|---|
| **Producer** | auction |
| **Consumers** | feedback, rating, notifications |
| **Payload** | |

```json
{
  "auctionId": "uuid",
  "sellerId": "uuid",
  "buyerId": "uuid",
  "finalPrice": 1500,
  "currency": "RUB",
  "completedAt": "ISO8601"
}
```

### `auction.expert_appraisal_added`

| | |
|---|---|
| **Producer** | auction |
| **Consumers** | BFF (cache invalidate), notifications (optional) |
| **Payload** | |

```json
{
  "auctionId": "uuid",
  "appraisalId": "uuid",
  "expertId": "uuid",
  "createdAt": "ISO8601"
}
```

---

## 💰 billing

### `billing.deposit_completed`

| | |
|---|---|
| **Producer** | billing |
| **Consumers** | financial-policy (check auto-renew) |
| **Payload** | |

```json
{
  "transactionId": "uuid",
  "userId": "uuid",
  "amount": 500,
  "currency": "RUB",
  "completedAt": "ISO8601"
}
```

### `billing.charge_completed`

| | |
|---|---|
| **Producer** | billing |
| **Consumers** | financial-policy, notifications |
| **Payload** | |

```json
{
  "transactionId": "uuid",
  "userId": "uuid",
  "amount": 200,
  "target": "auction.promotion",
  "description": "Аукцион #789 продвижение",
  "completedAt": "ISO8601"
}
```

### `billing.charge_failed`

| | |
|---|---|
| **Producer** | billing |
| **Consumers** | notifications |
| **Payload** | `{ transactionId, userId, reason }` |

---

## 📋 financial-policy

### `subscription.activated`

| | |
|---|---|
| **Producer** | financial-policy |
| **Consumers** | notifications, user-profile (cache invalidate) |
| **Payload** | `{ userId, planId, expiresAt }` |

### `subscription.expired`

| | |
|---|---|
| **Producer** | financial-policy |
| **Consumers** | notifications |
| **Payload** | `{ userId, planId, expiredAt }` |

---

## 🛒 marketplace

### `marketplace.order_completed`

| | |
|---|---|
| **Producer** | marketplace |
| **Consumers** | feedback, rating, notifications |
| **Payload** | |

```json
{
  "orderId": "uuid",
  "listingId": "uuid",
  "providerId": "uuid",
  "customerId": "uuid",
  "price": 3000,
  "currency": "RUB",
  "completedAt": "ISO8601"
}
```

### `marketplace.order_cancelled`

| | |
|---|---|
| **Producer** | marketplace |
| **Consumers** | notifications |
| **Payload** | `{ orderId, providerId, customerId, reason, cancelledAt }` |

---

## 💬 feedback

### `feedback.submitted`

| | |
|---|---|
| **Producer** | feedback |
| **Consumers** | rating |
| **Payload** | `{ dealType, auctionId?, orderId?, sellerId, buyerId, sellerRating, buyerRating }` |

### `feedback.reminder_due`

| | |
|---|---|
| **Producer** | feedback (CRON) |
| **Consumers** | notifications |
| **Payload** | `{ userId, dealType, auctionId?, orderId?, remindersCount }` |

---

## ⭐ rating

### `rating.penalty_applied`

| | |
|---|---|
| **Producer** | rating |
| **Consumers** | user-profile (sync cache), notifications |
| **Payload** | `{ userId, newRating, reason }` |

### `rating.user_banned`

| | |
|---|---|
| **Producer** | rating |
| **Consumers** | auction (block bids), forum (block posts), notifications |
| **Payload** | `{ userId, banUntil, reason }` |

---

## 🗣️ forum

### `forum.post_reported`

| | |
|---|---|
| **Producer** | forum |
| **Consumers** | notifications (admin alert) |
| **Payload** | `{ postId, reporterId, reason }` |

### `forum.comment_promoted_to_topic`

| | |
|---|---|
| **Producer** | forum |
| **Consumers** | notifications (опционально: подписчики ветки), BFF/WS (обновление UI) |
| **Payload** | `{ sourceTopicId, sourceCommentId, newTopicId, moderatorId, directChildCommentIds[] }` |

Модератор выделяет комментарий в равноправный топик: дети комментария переезжают под новый топик, у исходного комментария — ссылка на новый. См. [forum/requirements](../05-microservices/forum/requirements/README.md).

---

## 📬 notifications

### `notification.sent` / `notification.failed`

| | |
|---|---|
| **Producer** | notifications-adapter |
| **Consumers** | observability (metrics) |
| **Payload** | `{ notificationId, userId, channel, templateId, status }` |

---

## 📊 Матрица producer → consumer

| Event | auction | billing | financial-policy | feedback | rating | notifications | BFF/WS | marketplace |
|-------|---------|---------|------------------|----------|--------|---------------|--------|-------------|
| auction.completed | — | | | ✅ | ✅ | ✅ | | |
| auction.expert_appraisal_added | — | | | | | ✅ | ✅ | |
| auction.bid_placed | — | | | | | ✅ | ✅ | |
| marketplace.order_completed | | | | ✅ | ✅ | ✅ | | — |
| marketplace.order_cancelled | | | | | | ✅ | | — |
| billing.deposit_completed | | — | ✅ | | | | | |
| billing.charge_completed | | — | ✅ | | | ✅ | | |
| feedback.submitted | | | | — | ✅ | | | |
| feedback.reminder_due | | | | — | | ✅ | | |
| subscription.activated | | | — | | | ✅ | | |
| rating.user_banned | ✅ | | | | — | ✅ | | |

---

## 🔗 Связанные документы

- [Architecture](./README.md)
- [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md)
- [ADR-002 WSS](./adr/002-bff-rest-wss.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft

# 📨 Каталог событий (Event Catalog)

> **Exchange:** `tavrida-lot.events` (topic) · **Формат:** JSON · **Version:** envelope v1  
> **Статус реализации (2026-07-17):** большинство событий — **spec / planned**.
> **Реальный RMQ сегодня:** transactional outbox у `auction`, `marketplace`,
> `forum` и `user-profile`; `marketplace.order_completed` и
> `auction.completed` → `deal-feedback`; `tag.content_tagged` →
> `subscriptions` → notifications; consumers для `invitation.redeemed` planned.

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
| Producer delivery | Schema-local transactional outbox, publisher confirms, stable `eventId` |
| DLQ | `{queue-name}.dlq` после 5 retries (реализовано у live consumers) |
| Routing key | = `eventType` |
| Webhooks | Тип доступен для подписки только после регистрации генератором: `POST /internal/v1/webhooks/event-types/register` — см. [webhooks](../05-microservices/webhooks/README.md) |
| Fan-out | Один `eventType` → N очередей (по одной на consumer-сервис) — см. [messaging.md](./messaging.md) |

---

## 📡 Realtime (WS mapping)

BFF транслирует события в WebSocket с **другими именами** (краткая форма для клиента). Это **не** RabbitMQ routing keys.

| RabbitMQ `eventType` | WS `event` (BFF envelope) | Канал | Примечание |
|----------------------|----------------------------|-------|------------|
| `auction.bid_placed` | `bid.placed` | `auction:{id}` | |
| `auction.completed` | `auction.ended` | `auction:{id}`, `user:{seller\|buyer}` | ended = торги завершены |
| `billing.charge_completed` | `balance.updated` | `user:{id}` | агрегированное UI-событие |
| `notification.sent` | `notification.new` | `user:{id}` | |
| — (forum internal) | `message.new` | `forum:{topicId}` | из forum HTTP/RMQ, не 1:1 RMQ |
| — (forum internal) | `reaction.added` | `forum:{topicId}` | |
| `forum.comment_promoted_to_topic` | `topic.promoted` | `forum:{sourceTopicId}` | draft |

> WS-only события без RMQ аналога — допустимы для UI; producer = BFF после агрегации.

---

## 🔨 auction

### `auction.created`

| | |
|---|---|
| **Producer** | auction |
| **Consumers** | subscriptions (опционально) |
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
| **Consumers** | BFF (Redis pub/sub → WS), notifications, webhooks |
| **Payload** | `participantIds` — для webhook-фильтра `AUCTION_PARTICIPANT` |

```json
{
  "auctionId": "uuid",
  "sellerId": "uuid",
  "participantIds": ["uuid-seller", "uuid-bidder-1", "uuid-bidder-2"],
  "bidId": "uuid",
  "bidderId": "uuid",
  "amount": 1500,
  "currency": "RUB",
  "placedAt": "ISO8601"
}
```

> `participantIds` = `sellerId` + все `bidderId`, сделавшие ≥1 ставку на лот (снимок на момент события). См. [webhooks](../05-microservices/webhooks/README.md).

### `auction.completed`

| | |
|---|---|
| **Producer** | auction |
| **Consumers** | feedback, rating, notifications, webhooks |
| **Payload** | |

```json
{
  "auctionId": "uuid",
  "sellerId": "uuid",
  "buyerId": "uuid",
  "participantIds": ["uuid-seller", "uuid-buyer", "uuid-bidder-1"],
  "finalPrice": 1500,
  "currency": "RUB",
  "completedAt": "ISO8601"
}
```

> `participantIds` — seller, buyer и все, кто делал ставки (для webhook `AUCTION_PARTICIPANT`).

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
| **Consumers** | plan-config (check auto-renew) |
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
| **Consumers** | plan-config, notifications, **referral-rewards** |
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

### `billing.refund_completed`

| | |
|---|---|
| **Producer** | billing |
| **Consumers** | notifications, **referral-rewards** (clawback) |
| **Payload** | |

```json
{
  "refundTransactionId": "uuid",
  "originalTransactionId": "uuid",
  "userId": "uuid",
  "amount": 200,
  "currency": "RUB",
  "reason": "admin_request",
  "completedAt": "ISO8601"
}
```

### `billing.credit_completed`

| | |
|---|---|
| **Producer** | billing |
| **Consumers** | notifications (optional), **referral-rewards** (sync) |
| **Payload** | |

```json
{
  "transactionId": "uuid",
  "userId": "uuid",
  "amount": 99,
  "target": "referral.reward:accrual-uuid",
  "source": "referral-rewards",
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

## 📋 plan-config

### `subscription.activated`

| | |
|---|---|
| **Producer** | plan-config |
| **Consumers** | notifications, user-profile (cache invalidate) |
| **Payload** | `{ userId, planId, expiresAt }` |

### `subscription.expired`

| | |
|---|---|
| **Producer** | plan-config |
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

## 💬 deal-feedback (planned events)

### `deal_feedback.submitted`

| | |
|---|---|
| **Producer** | deal-feedback — **planned**, runtime producer отсутствует |
| **Consumers** | rating |
| **Payload** | `{ dealType, auctionId?, orderId?, sellerId, buyerId, sellerRating, buyerRating }` |

### `deal_feedback.reminder_due`

| | |
|---|---|
| **Producer** | deal-feedback CRON — **planned**, runtime пока `triggered: 0` |
| **Consumers** | notifications |
| **Payload** | `{ userId, dealType, auctionId?, orderId?, remindersCount }` |

---

## ⭐ rating

### `rating.updated`

| | |
|---|---|
| **Producer** | rating |
| **Consumers** | user-profile (denormalized cache), notifications (optional) |
| **Payload** | `{ userId, ratingValue, karma, context: 'auction' \| 'forum' \| 'marketplace' }` |

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
| **Consumers** | auction (block bids), forum (block write), notifications |
| **Payload** | `{ userId, banUntil, reason }` |

---

## 🗣️ forum

### `forum.content_reported`

| | |
|---|---|
| **Producer** | forum |
| **Consumers** | notifications (admin alert) |
| **Payload** | `{ contentId, contentType: 'topic' \| 'comment', reporterId, reason }` |

> **Deprecated:** `forum.post_reported` / `postId` — см. [ADR-005](../03-architecture/adr/005-forum-terminology.md).

### `forum.comment_promoted_to_topic`

| | |
|---|---|
| **Producer** | forum |
| **Consumers** | notifications (опционально: подписчики ветки), BFF/WS (обновление UI) |
| **Payload** | `{ sourceTopicId, sourceCommentId, newTopicId, moderatorId, directChildCommentIds[] }` |

Модератор выделяет комментарий в равноправный топик: дети комментария переезжают под новый топик, у исходного комментария — ссылка на новый. См. [forum/requirements](../05-microservices/forum/requirements/README.md).

### `tag.content_tagged`

| | |
|---|---|
| **Status** | **Implemented (transactional outbox)** |
| **Producer** | forum в транзакции изменения `content_tag` |
| **Consumers** | `subscriptions` queue `subscriptions.events` → match + delivery prefs → notifications `tag-content` |
| **Payload** | `{ tagId, topicId, contentType, contentId, excludeUserIds? }` |

См. [forum/tags.md](../05-microservices/forum/tags.md) · [subscriptions](../05-microservices/subscriptions/README.md) · [WORK-PLAN-NEXT](../00-meta/WORK-PLAN-NEXT.md).

---

## 👤 user-profile

### `invitation.redeemed`

| | |
|---|---|
| **Status** | **Implemented (transactional outbox)** · consumers planned |
| **Producer** | user-profile (`InviteEventsPublisher` after first successful claim) |
| **Consumers** | rating (referral recompute) — stub/planned · **referral-rewards** (CPA) — planned |
| **Notes** | Claim и outbox-запись атомарны; при недоступном RMQ событие остаётся pending. Queue bind для consumers: routing key `invitation.redeemed` on `tavrida-lot.events`. |
| **Payload** | |

```json
{
  "inviteeId": "uuid",
  "inviterId": "uuid",
  "inviteCodeId": "uuid",
  "acceptedAt": "ISO8601"
}
```

---

## 🎁 referral-rewards

### `referral.reward_accrued`

| | |
|---|---|
| **Producer** | referral-rewards |
| **Consumers** | observability (optional) |
| **Payload** | |

```json
{
  "accrualId": "uuid",
  "beneficiaryId": "uuid",
  "inviteeId": "uuid",
  "ruleId": "subscription-l1",
  "depth": 1,
  "amount": 99,
  "currency": "RUB",
  "holdUntil": "ISO8601",
  "sourceEventId": "uuid"
}
```

### `referral.reward_paid`

| | |
|---|---|
| **Producer** | referral-rewards |
| **Consumers** | notifications, BFF (WS `balance.updated` via billing) |
| **Payload** | |

```json
{
  "accrualId": "uuid",
  "beneficiaryId": "uuid",
  "inviteeId": "uuid",
  "amount": 99,
  "currency": "RUB",
  "ruleId": "subscription-l1",
  "depth": 1,
  "billingTransactionId": "uuid"
}
```

### `referral.reward_reversed`

| | |
|---|---|
| **Producer** | referral-rewards |
| **Consumers** | notifications (optional) |
| **Payload** | `{ accrualId, beneficiaryId, amount, reason, originalTransactionId? }` |

> Спека: [referral-rewards](../05-microservices/referral-rewards/README.md) · ADR [013](../03-architecture/adr/013-referral-rewards-service.md).

---

## 📬 notifications

### `notification.sent` / `notification.failed`

| | |
|---|---|
| **Producer** | notifications-adapter |
| **Consumers** | observability (metrics) |
| **Payload** | `{ notificationId, userId, channel, templateId, status }` |

---

## 🔗 webhooks

### `webhooks.delivery_failed`

| | |
|---|---|
| **Producer** | webhooks |
| **Consumers** | notifications (admin alert, optional), observability |
| **Payload** | `{ deliveryId, endpointId, eventId, eventType, attemptCount, lastHttpStatus }` |

### `webhooks.endpoint_disabled`

| | |
|---|---|
| **Producer** | webhooks |
| **Consumers** | notifications (owner email), observability |
| **Payload** | `{ endpointId, ownerId, scope, deadStreak }` |

> **Consumer `webhooks`** на доменных событиях — по whitelist из `EventTypeRegistration` (не все строки матрицы ниже).

---

## 📊 Матрица producer → consumer

> ✅ ниже = **целевая** подписка (spec). Колонка `deal-feedback` (ex `feedback`).  
> **Фактически wired в RMQ сейчас:** `marketplace.order_completed` и
> `auction.completed` → deal-feedback; `tag.content_tagged` → subscriptions.
> Остальные consumers — planned.

| Event | auction | billing | plan-config | deal-feedback | rating | notifications | webhooks | BFF/WS | marketplace | forum | subscriptions |
|-------|---------|---------|------------------|----------|--------|---------------|----------|--------|-------------|-------|---------------|
| auction.completed | — | | | ✅ **live** | ✅ | ✅ | ✅ | | | | opt |
| auction.expert_appraisal_added | — | | | | | ✅ | opt | ✅ | | | |
| auction.bid_placed | — | | | | | ✅ | ✅ | ✅ | | | opt |
| marketplace.order_completed | | | | ✅ **live** | ✅ | ✅ | opt | | — | | |
| marketplace.order_cancelled | | | | | | ✅ | opt | | — | | |
| billing.deposit_completed | | — | ✅ | | | | opt | | | | |
| billing.charge_completed | | — | ✅ | | | ✅ | opt | ✅ | | | |
| deal_feedback.submitted | | | | — | ✅ | | opt | | | | |
| deal_feedback.reminder_due | | | | — | | ✅ | | | | | |
| subscription.activated | | | — | | | ✅ | opt | | | | |
| rating.updated | | | | | — | opt | opt | | | | |
| rating.penalty_applied | | | | | — | ✅ | opt | | | | |
| rating.user_banned | ✅ | | | | — | ✅ | ✅ | | | ✅ | |
| forum.content_reported | | | | | | ✅ | opt | | | — | |
| forum.comment_promoted_to_topic | | | | | | opt | opt | ✅ | | — | |
| tag.content_tagged | | | | | | ✅ RMQ | | | | — **pub** | ✅ consume |
| webhooks.delivery_failed | | | | | | opt | — | | | | |
| webhooks.endpoint_disabled | | | | | | opt | — | | | | |

---

## 🔗 Связанные документы

- [Architecture](./README.md)
- [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md)
- [ADR-002 WSS](./adr/002-bff-rest-wss.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft

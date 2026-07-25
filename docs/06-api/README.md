# 🔌 API — соглашения Tavrida Lot

> **Статус:** draft v0.2 · **Base URL:** `https://{host}/api/v1`

## 🎯 Область применения

Этот документ описывает **публичный API BFF**. Internal API сервисов (`/internal/v1/`) следует тем же правилам, но без публикации в OpenAPI для клиентов.

## 📐 Версионирование

| Уровень | Формат | Пример |
|---------|--------|--------|
| URL path | `/api/v{major}/` | `/api/v1/auctions` |
| Breaking change | новый major | `/api/v2/` |
| Event envelope | `eventVersion` в payload | `"eventVersion": "1"` |

Deprecation: заголовок `Sunset: Sat, 01 Jan 2028 00:00:00 GMT` + `Deprecation: true`.

## 🔑 Аутентификация

```http
Authorization: Bearer {jwt}
```

- JWT от Logto, валидация на BFF
- Internal: shared opaque service token
  `Authorization: Bearer {INTERNAL_SERVICE_TOKEN}`; это не JWT.

## 📄 Формат запросов

- `Content-Type: application/json`
- Даты: ISO 8601 UTC (`2026-07-06T12:00:00Z`)
- UUID: lowercase v4
- Деньги: `{ "amount": 1500, "currency": "RUB" }` — amount в минорных единицах **нет**, decimal rubles

## ❌ Формат ошибок (RFC 7807)

```json
{
  "type": "https://tavrida-lot.ru/errors/insufficient-balance",
  "title": "Insufficient Balance",
  "status": 402,
  "detail": "Balance 100 RUB, required 200 RUB",
  "instance": "/api/v1/wallets/charge",
  "correlationId": "req-uuid",
  "errors": []
}
```

### Стандартные коды

| HTTP | type | Когда |
|------|------|-------|
| 400 | `validation-error` | Невалидный payload |
| 401 | `unauthorized` | Нет/просрочен JWT |
| 403 | `forbidden` | Keto denied / plan limit |
| 404 | `not-found` | Ресурс не найден |
| 409 | `conflict` | Дубликат / state conflict |
| 402 | `insufficient-balance` | billing.charge failed |
| 429 | `rate-limit-exceeded` | Rate limit BFF |
| 500 | `internal-error` | Непредвиденная ошибка |

## 📑 Пагинация

### Cursor-based (рекомендуется для лент)

```http
GET /api/v1/auctions?cursor=eyJpZCI6...&limit=20
```

```json
{
  "data": [],
  "pagination": {
    "nextCursor": "eyJpZCI6...",
    "hasMore": true
  }
}
```

### Offset (admin, редкие списки)

```http
GET /api/v1/admin/plan-config/variables?offset=0&limit=50
```

## 🔁 Идемпотентность

Платёжные и mutating операции:

```http
POST /api/v1/auctions
Idempotency-Key: {uuid}
```

- Для create-time paid options BFF связывает клиентский ключ с user и
  передаёт derived idempotency key в billing
- Повтор с тем же ключом → тот же `transactionId`, HTTP 200

## 🚦 Rate limiting

| Scope | Limit | Header |
|-------|-------|--------|
| Invite resolve | локальный guard | endpoint-specific |
| Global anonymous/authenticated | planned | target: 30/120 req/min |
| Bids | `auction.bidsPerHour` via plan-config | |

## 📡 WebSocket Protocol

> См. [ADR-002](../03-architecture/adr/002-bff-rest-wss.md)

**Endpoint:** `wss://{host}/ws/v1?token={jwt}`

### Подключение

```json
{ "type": "subscribe", "channel": "auction:uuid", "requestId": "1" }
```

### Сообщения сервера

```json
{
  "type": "event",
  "channel": "auction:uuid",
  "event": "bid.placed",
  "payload": { "bidId": "uuid", "amount": 1500 },
  "timestamp": "ISO8601"
}
```

### Каналы

| Channel | Events (WS name) | RMQ source (если есть) |
|---------|------------------|------------------------|
| `auction:{id}` | `bid.placed`, `auction.ended` | `auction.bid_placed`, `auction.completed` |
| `user:{id}` | `notification.new`, `balance.updated` | `notification.sent`, `billing.charge_completed` |
| `forum:{topicId}` | `message.new`, `reaction.added`, `topic.promoted` | см. [event-catalog § WS mapping](../03-architecture/event-catalog.md#-realtime-ws-mapping) |
| `chat:{chatId}` | `message.new`, `message.edited`, `message.deleted`, `member.joined`, `member.left`, `typing` | `chat.message_created`, … — [chat-api](./chat-api.md) |

> WS `event` ≠ RMQ `eventType` 1:1 — см. mapping table в event-catalog.

## 🗺️ Public API map (BFF)

| Domain | Methods | Upstream |
|--------|---------|----------|
| `/auctions` | list/get/create, create-options, bids, appraisal read | auction |
| `/wallets` | deposit, balance, transactions | billing |
| `/plans` | list, activate, subscription | plan-config |
| `/profile` | get, notes | user-profile |
| `/invites` | create, list, resolve, claim | BFF + Logto M2M — [OpenAPI fragment](./invites-api.md) · [full spec](../05-microservices/bff/invites-api.md) |
| `/forum/*` | topics, comments, reactions | forum |
| `/profile/:userId/rating/log` | get | user-profile |
| `/deal-feedback/*` | pending, submit, status | deal-feedback |
| `/subscriptions` | CRUD + delivery prefs | subscriptions |
| `/chats` | list, messages, DIRECT/GROUP/TOPIC, unread | chat — [OpenAPI fragment](./chat-api.md) |
| `/periods` | historical reference (read) | periods |
| `/admin/periods` | categories + periods CRUD | periods |
| `/marketplace` | listings + portfolio + orders | marketplace |
| `/media` | limits + upload intents | BFF / object storage |
| `/charges/quote` | quote paid option | plan-config |
| `/admin/scalar-config` | registry/domain CRUD | scalar-config |
| `/admin/plan-config` | plans/variables CRUD | plan-config |

> OpenAPI fragments: [invites-api.md](./invites-api.md), [vanga-admin-api.md](./vanga-admin-api.md), [chat-api.md](./chat-api.md). Full `openapi.yaml` — TODO (генерация из NestJS decorators).

## 🔗 Связанные разделы

- [BFF](../05-microservices/bff/README.md)
- [Invites API (fragment)](./invites-api.md) · [full invites spec](../05-microservices/bff/invites-api.md)
- [Vanga admin API](./vanga-admin-api.md)
- [Security](../09-security/README.md)
- [Architecture](../03-architecture/README.md)

---

**Автор:** команда разработки · **Версия:** 0.2-draft

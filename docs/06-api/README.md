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
- Internal: service token `Authorization: Bearer {service-jwt}` (TODO: ADR mTLS)

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
GET /api/v1/admin/parameters?offset=0&limit=50
```

## 🔁 Идемпотентность

Платёжные и mutating операции:

```http
POST /api/v1/wallets/charge
Idempotency-Key: {uuid}
```

- BFF проксирует ключ в billing
- Повтор с тем же ключом → тот же `transactionId`, HTTP 200

## 🚦 Rate limiting

| Scope | Limit | Header |
|-------|-------|--------|
| Anonymous | 30 req/min | `X-RateLimit-Remaining` |
| Authenticated | 120 req/min | |
| Bids | `auction.bidsPerHour` via financial-policy | |

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

| Channel | Events |
|---------|--------|
| `auction:{id}` | `bid.placed`, `auction.ended` |
| `user:{id}` | `notification.new`, `balance.updated` |
| `forum:{topicId}` | `message.new`, `reaction.added` |

## 🗺️ Public API map (BFF)

| Domain | Methods | Upstream |
|--------|---------|----------|
| `/auctions` | CRUD, bids | auction |
| `/wallets` | deposit, balance, transactions | billing |
| `/plans` | list, activate, subscription | financial-policy |
| `/profile` | get, notes | user-profile |
| `/forum/*` | topics, posts, reactions | forum |
| `/rating` | get | rating |
| `/feedback` | submit, status | feedback |
| `/settings` | get (public subset) | settings |

> OpenAPI spec: TODO `06-api/openapi.yaml` (генерация из NestJS decorators)

## 🔗 Связанные разделы

- [BFF](../05-microservices/bff/README.md)
- [Security](../09-security/README.md)
- [Architecture](../03-architecture/README.md)

---

**Автор:** команда разработки · **Версия:** 0.2-draft

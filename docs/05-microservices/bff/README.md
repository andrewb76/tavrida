# 🌐 Сервис: bff

> **Статус:** REST v1 implemented · **Версия:** 0.3

## 🎯 Назначение

**Backend-for-Frontend** — единая точка входа для Vue SPA Tavrida Lot.

- **REST** `/api/v1/*` — агрегация и proxy к domain services
- **WebSocket** `/ws/v1` — target, пока не реализован
- JWT validation (Logto), internal Bearer, `Idempotency-Key` для paid writes
- Скрывает internal topology от клиента

> [ADR-002 REST + WSS](../../03-architecture/adr/002-bff-rest-wss.md)

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Upstream** | Internal микросервис |
| **Channel** | WS-подписка: `auction:{id}`, `user:{id}`, `forum:{topicId}` |
| **Aggregation** | Объединение ответов нескольких upstream в один JSON |
| **Relay** | Redis pub/sub → WS без бизнес-логики |

## 🔌 REST — routing table

BFF **не дублирует** domain logic: валидирует JWT/DTO, применяет policy и
обращается к internal API.

| BFF path | Methods | Upstream / orchestration |
|----------|---------|--------------------------|
| `/api/v1/auctions`, `/auctions/create-options`, `/auctions/{id}` | GET, POST | auction + plan-config + billing |
| `/api/v1/auctions/{id}/bids`, `/expert-appraisals` | GET; bids POST | auction |
| `/api/v1/wallets/*` | balance/transactions GET, deposit POST | billing |
| `/api/v1/plans/*` | list/subscription GET, activate/cancel-auto-renew POST | plan-config |
| `/api/v1/charges/quote` | GET | plan-config |
| `/api/v1/profile/{userId}`, `/profile/notes`, rating log | GET/POST/PATCH/DELETE | user-profile |
| `/api/v1/invites/*` | create/list/resolve/claim | BFF + Logto + user-profile |
| `/api/v1/forum/*` | categories, topics, comments, tags, reactions, votes | forum |
| `/api/v1/marketplace/*` | listings, portfolio, orders, my listings | marketplace |
| `/api/v1/subscriptions`, `/subscriptions/delivery` | CRUD / GET/PATCH | subscriptions |
| `/api/v1/deal-feedback/{pending,status,submit}` | GET/POST | deal-feedback |
| `/api/v1/media/*` | limits, upload intents | BFF + object storage |
| `/api/v1/periods/*`, `/api/v1/admin/periods/*` | read / admin CRUD | periods |
| `/api/v1/admin/scalar-config/*` | registry/domain values | scalar-config |
| `/api/v1/admin/plan-config/*` | plans/variables | plan-config |
| `/api/v1/admin/users/*`, `/api/v1/admin/vanga/*` | admin operations | mixed |
| `/api/v1/me/roles`, `/api/v1/me/identity` | GET/POST | Keto + user-profile |
| `/api/v1/webhooks/logto` | POST | Logto inbound → user-profile |

> **`X-Act-As`:** admin JWT + target user id → effective identity.
> [impersonation](../../09-security/impersonation.md) · [ADR-018](../../03-architecture/adr/018-admin-impersonation.md).

Полные соглашения: [06-api](../../06-api/README.md).

### Aggregation patterns

| Endpoint | Upstreams | Пример ответа |
|----------|-----------|---------------|
| `GET /auctions/{id}` | auction + expert-appraisals (parallel) | merged JSON |
| `GET /plans` | plan-config | pass-through |

Параллельные вызовы — `Promise.all`; partial failure → 207 или degrade field (document per endpoint).

## 📡 WebSocket

**Endpoint:** `wss://{host}/ws/v1?token={jwt}`

### Client → server

```json
{ "type": "subscribe", "channel": "auction:uuid", "requestId": "1" }
{ "type": "unsubscribe", "channel": "auction:uuid", "requestId": "2" }
{ "type": "ping", "requestId": "3" }
```

### Server → client

```json
{
  "type": "event",
  "channel": "auction:uuid",
  "event": "bid.placed",
  "payload": { "bidId": "uuid", "amount": 1500 },
  "timestamp": "2026-07-08T12:00:00Z"
}
```

### Каналы и relay

| Channel | WS `event` | Source |
|---------|------------|--------|
| `auction:{id}` | `bid.placed`, `auction.ended` | Redis ← `auction.bid_placed`, `auction.completed` |
| `user:{id}` | `notification.new`, `balance.updated` | Redis ← notifications, `billing.charge_completed` |
| `forum:{topicId}` | `message.new`, `reaction.added`, `topic.promoted` | Redis ← forum / RMQ |

> WS имена ≠ RMQ `eventType` — [event-catalog § WS mapping](../../03-architecture/event-catalog.md#-realtime-ws-mapping)

### Auth

- JWT в query `token` или первом frame `auth`
- Подписка `user:{id}` — только если `id === jwt.sub`
- `auction:{id}` — public read для ACTIVE; write через REST

## 🔗 Взаимодействие

| Компонент | Протокол | Направление |
|-----------|----------|-------------|
| Domain services | HTTP `/internal/v1/` | BFF → upstream |
| Logto | JWKS | BFF → OIDC |
| Redis | target для будущего WS relay | planned |
| Traefik | TLS termination | edge → BFF |

## 🔒 Безопасность

- Единственный public HTTP/WS для SPA
- Internal services — private network (Swarm overlay)
- Rate limit: локально реализован для invite resolve; глобальный throttling — planned
- CORS: `*.tavrida-lot.ru`, localhost dev
- `Idempotency-Key` — proxy на billing/plan-config без изменения
- Admin routes — Keto `platform:tavrida-lot#admin`

## ⚙️ Окружение

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `LOGTO_JWKS_URL` | да | JWT validation |
| `LOGTO_M2M_APP_ID` | да | Management API (invites) |
| `LOGTO_M2M_APP_SECRET` | да | M2M secret |
| `LOGTO_M2M_RESOURCE` | да | `https://default.logto.app/api` |
| `FRONTEND_ORIGIN` | да | Invite links, CORS ref |
| `REDIS_URL` | нет | Будущий WS relay |
| `AUCTION_URL` | да | Upstream |
| `BILLING_URL` | да | Upstream |
| `PLAN_CONFIG_URL` | да | Upstream |
| `FORUM_URL` | нет | Upstream |
| `DEAL_FEEDBACK_URL` | нет | Upstream deal-feedback |
| `USER_PROFILE_URL` | нет | Upstream |
| `SCALAR_CONFIG_URL` | нет | Upstream |
| `PORT` | нет | default `3000` |
| `CORS_ORIGINS` | нет | comma-separated |

> [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md)

## 📋 TODO (implementation)

- [x] Invites orchestration (`InvitesController`, Logto M2M, user-profile client)
- [ ] OpenAPI generation from NestJS controllers
- [ ] WS sticky sessions / Redis adapter at scale
- [ ] Circuit breaker per upstream
- [x] admin REST routing (`/api/v1/admin/*`)

## 📎 Связанные разделы

- [06-api](../../06-api/README.md)
- [ADR-002](../../03-architecture/adr/002-bff-rest-wss.md)
- [event-catalog](../../03-architecture/event-catalog.md)
- [Security](../../09-security/README.md)
- [14-frontend](../../14-frontend/README.md)
- [invites-api](./invites-api.md) — Logto one-time token + referral

---

**Автор:** команда разработки · **Версия:** 0.2-spec

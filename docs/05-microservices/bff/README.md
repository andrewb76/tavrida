# 🌐 Сервис: bff

> **Статус:** spec ready · **Версия:** 0.2

## 🎯 Назначение

**Backend-for-Frontend** — единая точка входа для Vue SPA Tavrida Lot.

- **REST** `/api/v1/*` — агрегация и proxy к domain services
- **WebSocket** `/ws/v1` — realtime (ставки, баланс, уведомления, форум)
- JWT validation (Logto), rate limiting, Idempotency-Key proxy
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

BFF **не дублирует** domain logic — validate JWT, map paths, forward headers.

| BFF path | Methods | Upstream | Internal path |
|----------|---------|----------|---------------|
| `/api/v1/auctions` | GET, POST | auction | `/internal/v1/auctions` |
| `/api/v1/auctions/{id}` | GET, PATCH | auction | `/internal/v1/auctions/{id}` |
| `/api/v1/auctions/{id}/bids` | GET, POST | auction | `/internal/v1/auctions/{id}/bids` |
| `/api/v1/auctions/{id}/promote` | POST | auction | `/internal/v1/auctions/{id}/promote` |
| `/api/v1/auctions/{id}/expert-appraisals` | GET, POST | auction | `/internal/v1/…` |
| `/api/v1/wallets/balance` | GET | billing | `/internal/v1/wallets/balance` |
| `/api/v1/wallets/transactions` | GET | billing | `/internal/v1/wallets/transactions` |
| `/api/v1/wallets/deposit` | POST | billing | `/internal/v1/wallets/deposit` |
| `/api/v1/plans` | GET | plan-config | `/internal/v1/plans` |
| `/api/v1/plans/subscription` | GET | plan-config | `/internal/v1/subscription` |
| `/api/v1/plans/activate` | POST | plan-config | `/internal/v1/plans/activate` |
| `/api/v1/profile` | GET, PATCH | user-profile | `/internal/v1/profile` |
| `/api/v1/profile/notes` | GET, POST | user-profile | `/internal/v1/profile/notes` |
| `/api/v1/invites` | GET, POST | BFF orchestration | [invites-api.md](./invites-api.md) |
| `/api/v1/invites/resolve` | GET | BFF orchestration | public, см. [invites-api.md](./invites-api.md) |
| `/api/v1/invites/claim` | POST | BFF orchestration | см. [invites-api.md](./invites-api.md) |
| `/api/v1/me/roles` | GET | BFF + Keto | JWT → platform roles (`member`, `admin`, …) |
| `/api/v1/admin/settings/club` | GET, PATCH | BFF + settings | Admin: значения домена `club.*` |
| `/api/v1/admin/settings/registry` | GET | scalar-config | Реестр ключей (вкл. зависшие) |
| `/api/v1/admin/settings/keys/:key` | DELETE | scalar-config | Удаление зависшего ключа |
| `/api/v1/admin/financial/parameters/:key` | DELETE | plan-config | Удаление зависшего параметра |
| `/api/v1/admin/vanga/defaults` | GET | BFF + monetization-engine | Admin: YAML ranges + overlay |
| `/api/v1/admin/vanga/simulate` | POST | BFF + monetization-engine | Admin: revenue forecast |
| `/api/v1/admin/vanga/compare` | POST | BFF + monetization-engine | Admin: до 3 сценариев |
| `/api/v1/settings/public` | GET | settings (via BFF TBD) | Публичное подмножество |
| `/api/v1/forum/categories` | GET | forum | `/internal/v1/forum/categories` |
| `/api/v1/forum/topics` | GET, POST | forum | `/internal/v1/forum/topics` |
| `/api/v1/forum/topics/{id}/comments` | GET, POST | forum | `/internal/v1/…` |
| `/api/v1/webhooks/logto` | POST | BFF → user-profile | Logto inbound; см. [logto-webhooks.md](../../14-frontend/logto-webhooks.md) |
| `/api/v1/admin/users` | GET, PATCH, POST | BFF + user-profile + Keto + billing | Admin user list / roles / deposit |
| `/api/v1/rating/{userId}` | GET | rating | `/internal/v1/rating/{userId}` |
| `/api/v1/feedback` | POST, GET | feedback | `/internal/v1/feedback` |
| `/api/v1/marketplace/*` | GET, POST, PATCH, DELETE | marketplace | `/internal/v1/marketplace/…` |
| `/api/v1/auction-subscriptions` | GET, POST, DELETE | auction-subscriptions | `/internal/v1/subscriptions` |
| `/api/v1/settings/public` | GET | scalar-config | `/internal/v1/settings/public` |
| `/api/v1/webhooks` | GET, POST | webhooks | `/internal/v1/webhooks` |
| `/api/v1/webhooks/{id}` | GET, PATCH, DELETE | webhooks | `/internal/v1/webhooks/{id}` |
| `/api/v1/webhooks/{id}/deliveries` | GET | webhooks | `/internal/v1/webhooks/{id}/deliveries` |
| `/api/v1/admin/webhooks` | GET, POST, PATCH, DELETE | webhooks | `/internal/v1/admin/webhooks` |
| `/api/v1/admin/*` | * | mixed | admin + Keto `admin` role |

Полные соглашения: [06-api/README.md](../../06-api/README.md)

### Aggregation patterns

| Endpoint | Upstreams | Пример ответа |
|----------|-----------|---------------|
| `GET /profile/me` | user-profile + rating | `{ profile, rating, subscription }` |
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
| Redis | pub/sub + optional session | bidirectional |
| Traefik | TLS termination | edge → BFF |

## 🔒 Безопасность

- Единственный public HTTP/WS для SPA
- Internal services — private network (Swarm overlay)
- Rate limit: 120 req/min auth, 30 anonymous ([06-api](../../06-api/README.md))
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
| `REDIS_URL` | да | WS relay |
| `AUCTION_URL` | да | Upstream |
| `BILLING_URL` | да | Upstream |
| `PLAN_CONFIG_URL` | да | Upstream |
| `FORUM_URL` | нет | Upstream |
| `RATING_URL` | нет | Upstream |
| `FEEDBACK_URL` | нет | Upstream |
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
- [ ] admin-ui routing (`/api/v1/admin/*`)

## 📎 Связанные разделы

- [06-api](../../06-api/README.md)
- [ADR-002](../../03-architecture/adr/002-bff-rest-wss.md)
- [event-catalog](../../03-architecture/event-catalog.md)
- [Security](../../09-security/README.md)
- [14-frontend](../../14-frontend/README.md)
- [invites-api](./invites-api.md) — Logto one-time token + referral

---

**Автор:** команда разработки · **Версия:** 0.2-spec

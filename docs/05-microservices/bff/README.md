# 🌐 Сервис: bff

> **Статус:** draft · **Версия:** 0.1

## 🎯 Назначение

Backend-for-Frontend — единая точка входа для Vue-приложения Tavrida Lot.

- **REST** `/api/v1/*` — CRUD, агрегация данных из микросервисов
- **WebSocket** `/ws/v1` — realtime (ставки, уведомления, чат форума)
- Проверка JWT (Logto), rate limiting, Idempotency-Key proxy
- Скрывает внутреннюю топологию сервисов от клиента

> Решение: [ADR-002 REST + WSS](../../03-architecture/adr/002-bff-rest-wss.md)

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **BFF** | Backend-for-Frontend, API Gateway для фронтенда |
| **Upstream** | Внутренний микросервис (billing, auction и т.д.) |
| **Channel** | WS-подписка: `auction:{id}`, `user:{id}`, `forum:{topicId}` |

## 🔌 API (REST)

Полная карта: [06-api/README.md](../../06-api/README.md)

| Prefix | Upstream |
|--------|----------|
| `/api/v1/auctions` | auction |
| `/api/v1/wallets` | billing |
| `/api/v1/plans` | financial-policy |
| `/api/v1/profile` | user-profile |
| `/api/v1/forum/*` | forum |
| `/api/v1/rating` | rating |
| `/api/v1/feedback` | feedback |

## 📡 WebSocket

**Endpoint:** `wss://{host}/ws/v1?token={jwt}`

| Channel | Events | Upstream source |
|---------|--------|-----------------|
| `auction:{id}` | `bid.placed`, `auction.ended` | auction → Redis pub/sub |
| `user:{id}` | `notification.new`, `balance.updated` | notifications, billing |
| `forum:{topicId}` | `message.new`, `reaction.added` | forum |

## 🔗 Взаимодействие

| Сервис | Протокол | Направление |
|--------|----------|-------------|
| Все domain services | HTTP `/internal/v1/` | BFF → upstream |
| Logto | OIDC/JWT validation | BFF → Logto JWKS |
| Redis | pub/sub | upstream → BFF → client WS |

## 🔒 Безопасность

- Единственный публичный API + WS для фронтенда
- Internal services недоступны из internet (Traefik network ACL)
- Rate limiting: 120 req/min authenticated, 30 anonymous
- CORS: только `*.tavrida-lot.ru`, `*.tavrida-lot.localhost`

## ⚙️ Окружение

| Переменная | Описание |
|------------|----------|
| `LOGTO_JWKS_URL` | JWKS для JWT |
| `REDIS_URL` | WS pub/sub relay |
| `{SERVICE}_URL` | URL каждого upstream |
| `PORT` | HTTP (default 3000) |

## 📋 TODO

- [ ] Полный routing table
- [ ] Response aggregation patterns (profile + rating)
- [ ] WS scale: sticky sessions / Redis adapter
- [ ] admin routes `/api/v1/admin/*`

## 📎 Связанные разделы

- [06-api](../../06-api/README.md)
- [ADR-002](../../03-architecture/adr/002-bff-rest-wss.md)
- [Security](../../09-security/README.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft

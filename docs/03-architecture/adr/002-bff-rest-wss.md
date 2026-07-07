# ADR-002: BFF — REST + WebSocket

> **Статус:** accepted · **Дата:** 2026-07-06

## 🎯 Контекст

Фронтенд (Vue) нуждается в:

- CRUD и агрегации данных (профиль + рейтинг + лимиты);
- realtime-обновлениях (ставки на аукционе, уведомления, чат в теме форума).

Открытый вопрос: REST vs GraphQL на BFF.

## ✅ Решение

**REST для запросов/ответов + WebSocket (WSS) для realtime.**

### REST (BFF → клиент)

- Префикс `/api/v1/`
- JSON, RFC 7807 для ошибок
- BFF агрегирует данные из нескольких upstream-сервисов
- Idempotency-Key для платёжных операций

### WebSocket (BFF → клиент)

- Endpoint: `wss://{host}/ws/v1`
- Аутентификация: JWT в query `?token=` или первом frame
- Каналы (subscribe):

| Channel | События | Upstream |
|---------|---------|----------|
| `auction:{id}` | `bid.placed`, `auction.ended` | auction (Redis pub/sub или RabbitMQ fanout) |
| `user:{id}` | `notification.new`, `balance.updated` | notifications, billing |
| `forum:{topicId}` | `message.new`, `reaction.added` | forum |

- BFF — **единственный** WS endpoint для клиента; сервисы не открывают WS наружу

### Internal (сервис ↔ сервис)

- HTTP `/internal/v1/` — синхронные вызовы
- RabbitMQ — асинхронные события

## 🔄 Альтернативы

| Вариант | Плюсы | Минусы |
|---------|-------|--------|
| GraphQL | Гибкая агрегация | Сложнее кэш, WS subscriptions, learning curve |
| SSE вместо WS | Проще, one-way | Нет bidirectional (чат) |
| WS в каждом сервисе | Прямой доступ | Множество соединений, auth дублируется |
| **REST + WSS на BFF** | Единая точка, привычный стек | BFF становится критичным компонентом |

## 📌 Последствия

- ✅ GraphQL отложен; при необходимости — отдельный ADR
- ✅ auction, forum документируют Redis pub/sub → BFF relay
- ✅ `06-api/README.md` — секция WebSocket protocol
- ✅ Traefik: sticky sessions или Redis adapter для WS scaling
- ⚠️ BFF — SPOF для realtime; нужен horizontal scale + shared pub/sub

## 🔗 Связанные документы

- [06-api](../../06-api/README.md)
- [bff README](../../05-microservices/bff/README.md)

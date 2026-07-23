# 💬 Сервис: chat

> **Статус:** scaffold · **Версия:** 0.7 · **Schema:** `chat` · **Port:** 3016  
> **Код:** `services/chat` (`@tavrida/chat`)  
> **Решения:** [requirements/analysis.md](./requirements/analysis.md) · **BFF API:** [chat-api.md](../../06-api/chat-api.md)  
> **Не путать:** RabbitMQ [messaging](../../03-architecture/messaging.md) · deal-messaging [ADR-009](../../03-architecture/adr/009-deal-messaging-e2ee.md)

## 🎯 Назначение

**Приватные чаты клуба:** DIRECT (1:1 и self-DM), GROUP, TOPIC (side chat темы форума).

- Публичный доступ — только через **BFF** REST + WSS ([ADR-002](../../03-architecture/adr/002-bff-rest-wss.md))
- TOPIC side chat: tariff **`forum.author.13topic.chatEnabled`**, реализация в `chat`
- Admin клуба **не** читает чужие чаты (v1)

## ✅ Реализовано

| Слой | Статус |
|------|--------|
| requirements/analysis.md + PLATFORM-REGISTRY | ✅ |
| event-catalog + chat-api | ✅ |
| Scaffold NestJS + migration + internal API | ✅ |
| BFF `/api/v1/chats/*` (list/unread/self/direct/topic/messages) | ✅ |
| Plan gates on BFF (dm/self/topic/attachment/mention) | ✅ |
| Plan/scalar manifests (constants) | ✅ |
| Plan seed `chat.member.*` + `forum.author.13topic.chatEnabled` | ✅ |
| Scalar sync `chat.*` (BFF bootstrap) + admin form | ✅ |
| RMQ TOPIC consumers (`forum.topic_published` / `comment_created`) | ✅ |
| Swarm `chat` service + `CHAT_URL` on BFF | ✅ |
| Frontend «Мои чаты» + TOPIC bottom sheet | ✅ |
| DM title = имя peer (BFF enrich) | ✅ |
| Message status DELIVERED/READ (+ FE SENDING) | ✅ |
| Wave A: list preview, reply, edit/delete, hide, room UX | ✅ |
| Wave B: outbox → RMQ → BFF `/ws/v1` + FE `useWs` + typing | ✅ |
| Wave C: media attachments (`domain=chat`, enrich DTO) | ✅ |

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Chat** | Комната: `kind` = `DIRECT` \| `GROUP` \| `TOPIC` |
| **DIRECT (pair)** | Ровно два разных `userId`; canonical один чат на пару |
| **DIRECT (self)** | Self-DM / «Заметки» |
| **GROUP** | 2+ участников; owner = создатель / spawn |
| **TOPIC** | Side chat форума; `contextType=FORUM_TOPIC` |
| **Spawn** | GROUP из DIRECT; DM остаётся; копия последних N |
| **Mention** | `@username` rich link; SoT Logto — [username.md](../user-profile/requirements/username.md) |
| **displayTitle** | UI-заголовок: для pair-DM — имя peer; self — «Заметки» |
| **Message status** | Для автора: `SENDING` (FE) → `DELIVERED` → `READ` (по `lastReadAt` peers) |

## 🗄️ Сущности

Schema: **`chat`**. Tables: `chat`, `chat_member`, `message`, `message_attachment`, `outbox_message`.

См. код: `services/chat/src/entities/`.

## 🔌 API

### Public (BFF) — planned

[chat-api.md](../../06-api/chat-api.md)

### Internal (`/internal/v1/chats/*`) — scaffold

| Method | Path | Описание |
|--------|------|----------|
| GET | `/internal/v1/chats?userId=` | Список (optional `kind`) |
| GET | `/internal/v1/chats/unread?userId=` | `{ chatsWithUnread, totalUnreadMessages }` |
| POST | `/internal/v1/chats/direct/ensure` | `{ userId, peerUserId }` |
| POST | `/internal/v1/chats/self/ensure` | `{ userId }` |
| POST | `/internal/v1/chats/topic/ensure` | `{ topicId, authorId }` |
| POST | `/internal/v1/chats/topic/members/add` | `{ topicId, userId }` |
| GET | `/internal/v1/chats/:id?userId=` | Детали (member check) |
| GET | `/internal/v1/chats/:id/messages?userId=` | История |
| POST | `/internal/v1/chats/:id/messages` | Send (`replyToMessageId` optional) |
| PATCH | `/internal/v1/chats/:id/messages/:messageId` | Edit own |
| DELETE | `/internal/v1/chats/:id/messages/:messageId` | Soft-delete own |
| POST | `/internal/v1/chats/:id/hide` | Hide for member |
| POST | `/internal/v1/chats/:id/read` | Mark read |
| GET | `/health`, `/health/ready` | — |

## 📡 WebSocket (BFF)

Канал `chat:{chatId}` — **live** (Wave B). Relay: chat outbox → RMQ → BFF `ChatWsRelayConsumer` → `WsHubService`.  
Typing — WS-only. См. [chat-api.md](../../06-api/chat-api.md).

## ⚙️ Переменные scalar-config

Manifest: `services/chat/src/config/scalar-variable-manifest.ts` · [PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md)

## 💳 Переменные plan-config

Manifest: `services/chat/src/config/plan-variable-manifest.ts`. TOPIC gate — `forum.author.13topic.chatEnabled`.

## 📨 События

Produce/consume — planned ([event-catalog](../../03-architecture/event-catalog.md)). Outbox table ready.

## 🔗 Взаимодействие

| Сервис | Протокол | Зачем |
|--------|----------|-------|
| **bff** | REST + WSS | Публичный API (next) |
| **plan-config** / **scalar-config** | HTTP sync | limits / features (next) |
| **forum** | RMQ | `forum.topic_published` → ensure TOPIC+author; `forum.comment_created` → join member |
| **user-profile** | HTTP | username search |
| **media** | presign | вложения |

## 🔒 Безопасность

- Fail-closed plan gates — на BFF (next)
- Internal token: `INTERNAL_SERVICE_TOKEN` в production
- Admin no read чужих чатов

## 🌍 Окружение

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `DATABASE_URL` | да | schema `chat` |
| `CHAT_PORT` / `PORT` | нет | default **3016** |
| `INTERNAL_SERVICE_TOKEN` | prod | internal API |
| `RABBITMQ_URL` | later | events |

```bash
pnpm --filter @tavrida/chat dev
```

## 📎 Связанные разделы

- [requirements/analysis.md](./requirements/analysis.md)
- [chat-api.md](../../06-api/chat-api.md)
- [username.md](../user-profile/requirements/username.md)
- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.3-scaffold

# Chat API (OpenAPI fragment)

> **Статус:** scaffold · **Auth:** JWT member · **Upstream:** `chat` :3016 via BFF  
> **Сервис:** [chat/README.md](../05-microservices/chat/README.md) · **Решения:** [analysis.md](../05-microservices/chat/requirements/analysis.md)

Публичный BFF surface для «Мои чаты», DIRECT/self/TOPIC, сообщений и unread badge.

**Реализовано в BFF:** list, unread, self, direct, topics/:id, messages, read, users/search.  
**Ещё нет:** groups, spawn-group, hide/leave/members/transfer, edit/delete message.

## Endpoints

| Method | Path | Описание |
|--------|------|----------|
| `GET` | `/api/v1/chats` | Список чатов |
| `GET` | `/api/v1/chats/unread` | Агрегат unread badge |
| `GET` | `/api/v1/chats/self` | Self-DM («Заметки») |
| `POST` | `/api/v1/chats/direct` | Open/create DIRECT |
| `POST` | `/api/v1/chats/groups` | Создать GROUP |
| `POST` | `/api/v1/chats/{directChatId}/spawn-group` | Spawn GROUP из DIRECT |
| `GET` | `/api/v1/chats/topics/{forumTopicId}` | TOPIC room для W06 |
| `GET` | `/api/v1/chats/{chatId}` | Детали чата |
| `PATCH` | `/api/v1/chats/{chatId}` | Обновить GROUP title |
| `POST` | `/api/v1/chats/{chatId}/hide` | Скрыть для себя |
| `POST` | `/api/v1/chats/{chatId}/leave` | Покинуть GROUP |
| `POST` | `/api/v1/chats/{chatId}/members` | Invite в GROUP |
| `DELETE` | `/api/v1/chats/{chatId}/members/{userId}` | Kick (owner) |
| `POST` | `/api/v1/chats/{chatId}/transfer-owner` | Transfer ownership |
| `GET` | `/api/v1/chats/{chatId}/messages` | История сообщений |
| `POST` | `/api/v1/chats/{chatId}/messages` | Отправить сообщение |
| `PATCH` | `/api/v1/chats/{chatId}/messages/{messageId}` | Редактировать своё |
| `DELETE` | `/api/v1/chats/{chatId}/messages/{messageId}` | Удалить |
| `POST` | `/api/v1/chats/{chatId}/read` | Mark read |
| `GET` | `/api/v1/chats/users/search` | Autocomplete `@username` |

---

## Query parameters

### `GET /api/v1/chats`

| Param | Тип | Описание |
|-------|-----|----------|
| `kind` | enum | `DIRECT` \| `GROUP` \| `TOPIC` — фильтр (UI: Все / Личные / Группы / Темы) |
| `q` | string | Поиск по title / participant displayName / username |
| `cursor` | string | Cursor pagination |
| `limit` | int | default 30, max 100 |

### `GET /api/v1/chats/{chatId}/messages`

| Param | Тип | Описание |
|-------|-----|----------|
| `cursor` | string | Older messages |
| `limit` | int | default 50, max 100 |

---

## Request / response (ключевые)

### Unread badge

```http
GET /api/v1/chats/unread
```

```json
{
  "chatsWithUnread": 3,
  "totalUnreadMessages": 12
}
```

### Open DIRECT

```http
POST /api/v1/chats/direct
Content-Type: application/json

{ "userId": "logto-sub-of-peer" }
```

**403** если у текущего или peer нет `chat.member.dm.enabled`.  
**200/201** — `{ "chatId", "kind": "DIRECT", "self": false, ... }`.

### Spawn group

```http
POST /api/v1/chats/{directChatId}/spawn-group
Content-Type: application/json

{
  "title": "Обсуждение находки",
  "memberIds": ["uuid-a", "uuid-b"],
  "copyHistory": true,
  "copyCount": 25
}
```

`copyCount` clamp: `min(requested, plan.spawn.copyHistoryMax, scalar.copyHistoryMax)`.  
Direct chat **не** удаляется.

### Send message

```http
POST /api/v1/chats/{chatId}/messages
Content-Type: application/json

{
  "body": "Привет, @alice!",
  "attachmentIds": ["media-uuid"]
}
```

Response includes parsed `mentions[]` for rich render. **No** notification from @ alone.

### TOPIC on forum page

```http
GET /api/v1/chats/topics/{forumTopicId}
```

**403** без `forum.author.13topic.chatEnabled` или без membership.  
Создаёт lazy room при первом обращении автором после publish (internal ensure).

---

## WebSocket

```json
{ "type": "subscribe", "channel": "chat:{chatId}", "requestId": "1" }
```

| WS `event` | Payload (кратко) |
|------------|------------------|
| `message.new` | `{ messageId, chatId, authorId, body, mentions, createdAt }` |
| `message.edited` | `{ messageId, body, editedAt }` |
| `message.deleted` | `{ messageId, deletedAt }` |
| `member.joined` | `{ userId, chatId }` |
| `member.left` | `{ userId, chatId }` |
| `typing` | `{ userId, expiresAt }` |

---

## Errors (типовые)

| HTTP | Когда |
|------|-------|
| 403 | Plan gate / not a member / TOPIC Pro off |
| 404 | Chat or message not found |
| 409 | Spawn from non-DIRECT / self-DM spawn |
| 429 | `chat.member.message.dailyMax` exceeded |

---

## OpenAPI 3.0 (paths fragment)

```yaml
paths:
  /api/v1/chats/unread:
    get:
      operationId: getChatsUnread
      tags: [chats]
      security: [{ bearerAuth: [] }]
      summary: Unread aggregate for nav badge
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                required: [chatsWithUnread, totalUnreadMessages]
                properties:
                  chatsWithUnread: { type: integer, minimum: 0 }
                  totalUnreadMessages: { type: integer, minimum: 0 }

  /api/v1/chats/direct:
    post:
      operationId: openDirectChat
      tags: [chats]
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [userId]
              properties:
                userId: { type: string, minLength: 1 }
      responses:
        '201': { description: Chat created }
        '200': { description: Existing chat returned }
        '403': { description: DM not allowed by plan for one or both users }

  /api/v1/chats/{directChatId}/spawn-group:
    post:
      operationId: spawnGroupFromDirect
      tags: [chats]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: directChatId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                title: { type: string, maxLength: 120 }
                memberIds:
                  type: array
                  items: { type: string }
                copyHistory: { type: boolean, default: false }
                copyCount: { type: integer, minimum: 0, maximum: 100 }
      responses:
        '201': { description: Group created; direct chat unchanged }
```

> Полный YAML — при реализации BFF module `services/bff/src/modules/chats/`.

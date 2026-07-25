# 💬 Chat — анализ и решения (v1)

> **Статус:** draft · **Версия:** 0.1 · **Дата:** 2026-07-22  
> **Спека сервиса (скелет):** [../README.md](../README.md) · **Реестры:** [PLATFORM-REGISTRY](../../PLATFORM-REGISTRY.md) · [ADR-003](../../../03-architecture/adr/003-settings-vs-financial-policy.md) · [ADR-020](../../../03-architecture/adr/020-three-config-registries.md)

Документ фиксирует продуктовые и архитектурные решения по **приватным чатам клуба** перед реализацией.  
Не путать с RabbitMQ «messaging» ([messaging.md](../../../03-architecture/messaging.md)).

---

## 1. Контекст и границы

| Продукт | Где живёт | Суть |
|---------|-----------|------|
| **Club chat** | сервис `chat` | DIRECT / GROUP / TOPIC + self-DM |
| **Topic side chat** | `chat` kind=`TOPIC`, tariff **`forum.author.13topic.chatEnabled`** | Side chat темы форума |
| **Deal messaging** | отдельный сервис later ([ADR-009](../../../03-architecture/adr/009-deal-messaging-e2ee.md)) | Seller↔buyer по сделке, E2EE Phase 3 |

**Один микросервис `chat`** — не два. Schema PG: `chat`. Порт (docs): **3016**.

**Admin клуба** не читает чужие чаты (даже metadata-only support — later). E2EE для club chat — **не** v1 (возможен позже, отдельно от deal E2EE).

---

## 2. Kinds

```text
Chat.kind = DIRECT | GROUP | TOPIC
DIRECT.self = true | false   // self-DM vs пара пользователей
```

| Kind | Участники | Owner / kick | Создание | В «Мои чаты» |
|------|-----------|--------------|----------|--------------|
| **DIRECT** (pair) | ровно 2 разных `userId` | нет | «Написать» с профиля; canonical 1 чат на пару | фильтр **Личные** |
| **DIRECT** (self) | 1 `userId` | нет | авто / «Заметки»; spawn→GROUP **нет** | **Личные** |
| **GROUP** | 2+ | owner = кто **spawn**/создал; kick, transfer | spawn из DM или «новая группа» | **Группы** |
| **TOPIC** | автор темы + комментаторы | нет owner/kick (мод — через forum) | lazy room при publish + Pro | **Темы форума** |

### Фильтр списка

`Все | Личные | Группы | Темы форума`

### Unread badge (навигация)

Две цифры: **`{chatsWithUnread} / {totalUnreadMessages}`** (пример `3 / 12`).  
Per-chat unread — в списке. В агрегат входят все kinds, включая TOPIC и self.

---

## 3. DIRECT

- Canonical key пары (sorted userIds) → один чат навсегда.
- Leave/hide — только для себя; у второго чат остаётся.
- **Оба** участника должны иметь `chat.member.dm.enabled` (fail-closed).
- Медиа — MinIO/presign (как forum).

### Self-DM

- Приватные заметки / «Сохранённое».
- Gate: **`chat.member.self.enabled`** — независимо от `dm.enabled`; можно включить на **любом** тарифе (в т.ч. Free-only notes).
- Seed-предложение: Free `self=true`, `dm/group=false`; Basic/Pro — self+dm+group по матрице ниже.

---

## 4. GROUP и spawn из DIRECT

**Действие UI:** «Создать группу с…» — **не** «добавить в DM».

| Правило | Решение |
|---------|---------|
| После spawn | **DM остаётся** |
| Owner | инициатор spawn |
| История | чекбокс «скопировать» + input **N** последних сообщений; `N=0` = без копии |
| Cap N | scalar `chat.spawn.copyHistoryMax` = **100** (seed); plan `chat.member.spawn.copyHistoryMax` ≤ scalar |
| Эффективный N | `clamp(0, requestedN, planMax, scalarMax)` |

Members: invite, leave, @mention. Owner: kick, transfer ownership, edit/delete любого сообщения.

---

## 5. @mention

- Autocomplete по **уникальному** username: **SoT = Logto**, cache в `user_profile` ([username.md](../../user-profile/requirements/username.md)).
- **Только rich text:** клик → профиль (или open/create DIRECT — UX later).
- **Без** Novu / push / in-app notify.
- **Не** добавляет в GROUP и **не** конвертирует DM→GROUP.
- Gate: `chat.member.mention.enabled` + у автора/target есть username (после sync).

---

## 6. TOPIC (side chat форума)

| | Решение |
|--|---------|
| Реализация | `chat` room, `kind=TOPIC`, `context: { type: 'FORUM_TOPIC', id }` |
| Tariff | **`forum.author.13topic.chatEnabled`** (не дублировать в `chat.*`) |
| Автор | member с **publish** темы (`chat.topic.authorJoinOnPublish`) |
| Остальные | join при **первом comment** (`chat.topic.joinOnComment`); только читатель темы — **не** в чате |
| После первого чужого comment | автор остаётся; добавляется комментатор — membership не «переключается» |
| История для новичка | v1: member видит **полную** историю side chat комнаты |
| v1 scope | **вместе** с DIRECT/GROUP |
| Desktop | split panel (W06) |
| **Mobile v1** | **вариант B** — bottom sheet «Чат · N» (tabs later по usability) |

Модерация содержимого TOPIC — через forum/Keto; в chat v1 автор правит/удаляет **своё** (окна scalar).

---

## 7. UX «Мои чаты» и mobile TOPIC

```text
Desktop TOPIC:  [ topic + comments | side chat ]
Mobile TOPIC:   topic + comments + FAB/кнопка «Чат · N» → bottom sheet 50–90%
```

Self-DM в списке: ярлык «Заметки» (опционально pin вверху «Личные»).

### 7.1. Заголовок DIRECT (имя собеседника)

| Правило | Решение |
|---------|---------|
| Self-DM | UI: **«Заметки»** (и `title` в БД) |
| DIRECT pair | UI-заголовок = **имя собеседника**, не UUID |
| Порядок имени | `displayName` → `@username` → fallback **«Участник»** |
| SoT профиля | `user-profile` lookup (BFF enrich); chat хранит только `userId` |
| GROUP / TOPIC | как сейчас: `title` / контекст темы; peer-enrich не нужен |

API (BFF): в list/get для pair-DM — `peerUserId`, `peer: { userId, displayName, username, avatarUrl }`, `displayTitle` (готовая строка для UI).

### 7.2. Статусы сообщения (для автора)

Три состояния в UI (как «отправляется / доставлено / прочитано»):

| UI | Код | Когда |
|----|-----|--------|
| Отправляется | `SENDING` | только клиент (optimistic), до ответа `POST …/messages` |
| Доставлено | `DELIVERED` | сообщение сохранено на сервере; peer ещё не прочитал |
| Прочитано | `READ` | все **другие** активные участники: `lastReadAt >= message.createdAt` |

| Kind | Поведение |
|------|-----------|
| DIRECT pair | `READ`, когда peer отметил чтение (`POST …/read` / open room) |
| GROUP / TOPIC | `READ`, когда **все** остальные активные members прочитали; иначе `DELIVERED` |
| Self-DM | статусы **не показываем** (заметки себе) |

**Не в v1:** отдельный device delivery receipt (push/FCM ack), partial «прочитано 2/5» в GROUP UI, live-обновление без poll/WS.

Поле в API (для **своих** сообщений): `status: DELIVERED \| READ`. Чужие — `status: null`.  
Live: later WS `message.read` / `chat.message_read` после mark-read; до WS — статус обновляется при следующем fetch истории.

---

### 7.3. Telegram-like UX (wave A) — ✅ implemented

Цель: привычный мессенджер, **не** полный клон Telegram.

| Фича | Решение wave A | Статус |
|------|----------------|--------|
| Превью в списке | `lastMessagePreview` + `lastMessageAt` (+ authorId) | ✅ |
| Reply / quote | `replyToMessageId` на message; UI цитата над пузырём | ✅ |
| Edit / delete своего | окна scalar `editWindowMinutes` / `deleteOwnWindowMinutes`; soft-delete | ✅ |
| Hide чата | `chat_member.hidden_at`; новый message снимает hide у участников; UI: вкладка «Скрытые» + unhide | ✅ |
| Room UX | дата-сепараторы, denser bubbles, FAB «вниз» | ✅ |
| Live WS / typing / media | **wave B** WS ✅ · **wave C** media ✅ | ✅ |

---

## 8. Конфигурация — согласованный список ключей

Правило: [ADR-003](../../../03-architecture/adr/003-settings-vs-financial-policy.md) + кандидаты prefs → [ADR-020](../../../03-architecture/adr/020-three-config-registries.md) (post-MVP).

### 8.1. Scalar-config (`chat.*`)

| Ключ | Тип | Default | Описание |
|------|-----|---------|----------|
| `chat.spawn.copyHistoryMax` | number | `100` | Max N копируемых сообщений при spawn (API clamp) |
| `chat.message.editWindowMinutes` | number | `15` | Окно правки своего (`0` = нельзя, `-1` = всегда) |
| `chat.message.deleteOwnWindowMinutes` | number | `60` | Окно удаления своего |
| `chat.message.lengthHardMax` | number | `10000` | Абсолютный max длины; plan ≤ этого |
| `chat.message.pageSize` | number | `50` | Размер страницы истории (подгрузка; hard max 100) |
| `chat.markdown.sanitizeLevel` | enum | `strict` | `strict` \| `documentation` |
| `chat.moderation.bannedWordsList` | string[] | `[]` | Фильтр текста |
| `chat.history.retentionDays` | number | `0` | `0` = без авто-purge |
| `chat.unread.markReadOnOpen` | boolean | `true` | Read при открытии чата |
| `chat.realtime.typingTtlSeconds` | number | `5` | TTL typing |
| `chat.media.presignTtlSeconds` | number | `900` | TTL presign вложений |
| `chat.topic.authorJoinOnPublish` | boolean | `true` | Автор в TOPIC с publish |
| `chat.topic.joinOnComment` | boolean | `true` | Join TOPIC на comment |
| `chat.dm.selfAutoCreate` | boolean | `true` | Автосоздание self-DM |
| `chat.list.defaultFilter` | enum | `ALL` | `ALL` \| `DIRECT` \| `GROUP` \| `TOPIC` |
| `chat.group.leaveKeepsHistory` | boolean | `true` | История для оставшихся после leave |

### 8.2. Plan-config (`chat.member.*`)

Facet `member`. Seed-предложение Free/Basic/Pro — ориентир для admin; **self** крутится в любом тарифе.

#### Features

| Ключ | Free | Basic | Pro | Описание |
|------|------|-------|-----|----------|
| `chat.member.dm.enabled` | false | true | true | DIRECT с другим user |
| `chat.member.self.enabled` | true | true | true | Self-DM (заметки) |
| `chat.member.group.enabled` | false | true | true | GROUP + spawn |
| `chat.member.group.inviteEnabled` | false | true | true | Инвайт в GROUP |
| `chat.member.attachment.enabled` | false | true | true | Вложения |
| `chat.member.mention.enabled` | false | true | true | `@username` rich-link |
| `chat.member.search.listEnabled` | true | true | true | Фильтр/поиск списка (если есть доступ к чатам) |
| `chat.member.notify.messagePushEnabled` | **false** | **false** | **false** | Stub до Novu-chat workflows |
| `chat.member.notify.messageEmailDigestEnabled` | **false** | **false** | **false** | Stub до Novu-chat |

**TOPIC write/join:** проверять `forum.author.13topic.chatEnabled`, не отдельный `chat.member.topic.*`.

#### Limits

| Ключ | Free | Basic | Pro | Описание |
|------|------|-------|-----|----------|
| `chat.member.group.membershipMax` | 0 | 10 | ∞ | В скольких GROUP состоять |
| `chat.member.group.memberMax` | 0 | 20 | 100 | Макс. участников GROUP (owner) |
| `chat.member.group.createDailyMax` | 0 | 3 | 20 | Новых GROUP / сутки (spawn = create) |
| `chat.member.spawn.copyHistoryMax` | 0 | 50 | 100 | Max N ≤ scalar `copyHistoryMax` |
| `chat.member.message.dailyMax` | 0 | 200 | ∞ | Сообщений / сутки (все kinds) |
| `chat.member.message.lengthMax` | 500 | 2000 | 5000 | ≤ `lengthHardMax` |
| `chat.member.attachment.countMax` | 0 | 3 | 10 | Файлов на сообщение |
| `chat.member.attachment.sizeMaxMb` | 0 | 5 | 20 | Размер файла (MB) |
| `chat.member.message.historyMax` | 100 | 500 | ∞ | Глубина истории (скролл вверх + подгрузки) |

**Не вводим:** `chat.member.dm.activeMax` — достаточно `message.dailyMax`.

#### Enum / price

| | v1 |
|--|-----|
| `chat.member.search.messageScope` | **later** (`NONE` / `CURRENT_CHAT` / `ALL_MY_CHATS`) |
| `*.unitPrice` | **нет** в v1 |

### 8.3. User-prefs (кандидаты, post-MVP)

До [ADR-020](../../../03-architecture/adr/020-three-config-registries.md) — не в scalar/plan; при необходимости временная таблица `chat.user_preference`.

| Prefs key | Plan gate | Default | Смысл |
|-----------|-----------|---------|--------|
| `chat.notify.messagePush` | `chat.member.notify.messagePushEnabled` | true* | Push о сообщениях |
| `chat.notify.messageEmailDigest` | `…messageEmailDigestEnabled` | false | Email-дайджест |
| `chat.notify.muteUntil` | любой chat feature | null | Тихий режим |
| `chat.ui.enterToSend` | — | true | Enter = send |
| `chat.ui.showTopicInChatList` | membership / forum chat | true | TOPIC в «Мои чаты» |

\* пока plan stub false — prefs неактивны.

### 8.4. Матрица проверок

```text
DIRECT (pair)     → оба: chat.member.dm.enabled
Self-DM           → свой: chat.member.self.enabled
GROUP create/spawn→ chat.member.group.enabled + createDailyMax + memberMax
TOPIC write/join  → forum.author.13topic.chatEnabled
Copy history N    → min(requested, plan spawn.copyHistoryMax, scalar copyHistoryMax)
Attachment        → attachment.enabled + count/size
@mention          → mention.enabled (no Novu)
Message send      → message.dailyMax + lengthMax
```

---

## 9. Сущности (черновик)

| Entity | Поля (кратко) |
|--------|----------------|
| `Chat` | id, kind, self (DIRECT), contextType/Id (TOPIC), createdAt, spawnedFromChatId? |
| `ChatMember` | chatId, userId, role (`OWNER`\|`MEMBER`), joinedAt, hiddenAt?, lastReadAt, lastReadMessageId |
| `Message` | id, chatId, authorId, body, mentions JSON, createdAt, editedAt, deletedAt; **status derived** (не колонка) |
| `MessageAttachment` | messageId, mediaObjectId, … |
| `ChatUnread` / derived | per (userId, chatId) count — реализация TBD |

Unique: DIRECT pair canonical; DIRECT self per user; TOPIC per `forumTopicId`.

---

## 10. События (черновик)

| Event | Направление | Зачем |
|-------|-------------|-------|
| `forum.topic_published` / comment_created | consume | TOPIC room + membership |
| `chat.message_created` | produce | WS relay, later Novu |
| `chat.message_read` | produce (later) | WS `message.read` → обновить ticks у автора |
| `chat.member_joined` / `left` | produce | UI list |

Имена финализировать в [event-catalog](../../../03-architecture/event-catalog.md) при README сервиса.

Realtime: BFF WSS ([ADR-002](../../../03-architecture/adr/002-bff-rest-wss.md)); rooms `chat:{chatId}`.

---

## 11. Prerequisites

| Зависимость | Зачем |
|-------------|--------|
| Уникальный username (Logto SoT + cache) | @mention + invite autocomplete — [username.md](../../user-profile/requirements/username.md) |
| MinIO / media | вложения |
| plan-config + scalar-config sync | ключи §8 |
| forum publish/comment events | TOPIC membership |
| Novu-chat workflows | **после** stub notify features |

---

## 12. Вне scope v1

- Deal-messaging / E2EE ([ADR-009](../../../03-architecture/adr/009-deal-messaging-e2ee.md))
- Полнотекстовый поиск сообщений (OpenSearch — [ADR-008](../../../03-architecture/adr/008-opensearch-full-text.md))
- Центральный `user-prefs` сервис ([ADR-020](../../../03-architecture/adr/020-three-config-registries.md))
- Block-list UI (можно stub later)
- Device-level delivery receipts / partial read UI в GROUP
- Admin read чужих чатов

---

## 13. Следующие шаги docs

1. [x] `docs/05-microservices/chat/README.md` по [MICROSERVICE-SPEC](../../MICROSERVICE-SPEC.md)
2. [x] Строки ключей в [PLATFORM-REGISTRY](../../PLATFORM-REGISTRY.md)
3. [x] Cross-link в [forum/requirements](../../forum/requirements/README.md)
4. [x] Строка в [AGENT-DOCS-INDEX](../../../00-meta/AGENT-DOCS-INDEX.md)
5. [x] Username — [user-profile/requirements/username.md](../../user-profile/requirements/username.md)
6. [x] event-catalog + [chat-api](../../../06-api/chat-api.md)
7. [x] Scaffold `services/chat` :3016
8. [x] BFF module + FE list/room (Keto `chat:{id}#member` — optional later)
9. [x] GROUP spawn + plan/scalar sync + RMQ TOPIC
10. [x] DM displayTitle (peer) + message delivery status (`DELIVERED`/`READ`)

---

## 📎 Связанное

- [forum wireframes W06](../../../11-ux-ui/wireframes/forum.md) — Pro chat panel  
- [forum requirements](../../forum/requirements/README.md) — `forum.topicChatEnabled`  
- [ADR-020](../../../03-architecture/adr/020-three-config-registries.md) — три реестра  

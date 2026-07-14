# 🗣️ Сервис: forum

> **Статус:** scaffold · **Версия:** 0.3 · **Schema:** `forum` · **Порт:** 3009  
> **Детальные требования:** [requirements/README.md](./requirements/README.md)

## 🎯 Назначение

**Форум** — категории, топики, комментарии, реакции, **Markdown**, теги, справочник клуба.

- Сущности: `topic`, `comment` ([ADR-005](../../03-architecture/adr/005-forum-terminology.md))
- **Knowledge base:** политики категорий ([knowledge-base.md](./knowledge-base.md))
- **Теги:** [tags.md](./tags.md)
- Интеграция: rating (karma), billing (Pro-реакции), plan-config (лимиты)
- Realtime: Redis → BFF WS `forum:{topicId}`

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Category** | Дерево разделов |
| **Topic** | Корневое сообщение темы |
| **Comment** | Ответ в topic; **родитель — topic (корень) или любой comment** любой глубины ([ветки](#-ветки-комментариев)) |
| **Reaction** | Эмоция на `contentId` + `contentType` |
| **Content vote** | Исключительный +/- на topic/comment (один голос на пользователя) |
| **Promote** | Выделение comment → равноправный topic ([ADR-005](../../03-architecture/adr/005-forum-terminology.md)) |

## 🗄️ Сущности

| Таблица | Описание |
|---------|----------|
| `category` | Иерархия; `policy` jsonb (allowComments, …) |
| `topic` | Тема; `votePlusCount`, `voteMinusCount` |
| `comment` | Комментарий; `promotedTopicId`; vote counters |
| `comment_closure` | Closure table для дерева |
| `reaction` | emoji-реакции (`emojiKey`) |
| `content_vote` | +/- : `userId`+`contentId` PK, `value` ±1, `createdAt` |

## +/- голоса

- У участника на объект только одно состояние: **+**, **−** или **ничего**
- Повторный клик по активной кнопке снимает голос (если окно позволяет)
- Смена решения: `forum.vote.changeWindowMinutes` от **первого** голоса (`0` / `N` / `-1`)
- Свой контент голосовать нельзя
- Агрегаты денормализованы; `myVote` при чтении через `viewerId`
- BFF после голоса → `user-profile.adjust` с `source=FORUM_VOTE` (веса `forum.vote.karmaPlusWeight` / `karmaMinusWeight`)

| Данные | Сейчас | Next |
|--------|--------|------|
| Aggregates | `vote_*_count` на topic/comment | Redis hash |
| myVote | batch SQL на странице темы | Redis TTL ≈ окно смены |
| Settings | BFF `ForumSettingsReader` 30s | уже есть |

> DDL detail: [10-data](../../10-data/README.md)

## 🔌 API (BFF `/api/v1/forum/*`)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/forum/categories` | Дерево |
| GET/POST | `/forum/topics` | Список / создание |
| GET/PATCH | `/forum/topics/{id}` | Детали (+ `myVote` при auth) / edit window |
| GET/POST | `/forum/topics/{id}/comments` | Ветка; GET с `myVote` при auth |
| POST | `/forum/votes` | `{ contentId, contentType, value: 1\|-1 }` |
| POST | `/forum/votes/clear` | Снять голос |
| POST | `/forum/reactions` | `{ contentId, contentType, emojiKey }` |
| POST | `/forum/content/report` | Жалоба → `forum.content_reported` |
| POST | `/internal/.../comments/{id}/promote-to-topic` | Moderator only |

Лимиты UI → [requirements](./requirements/README.md) + [PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md).

## 💬 Ветки комментариев

Комментарий можно оставить **не только к теме**, но и **к любому комментарию** в этой теме — на **любой глубине** вложенности.

| Родитель | `parentId` в POST | Пример |
|----------|-------------------|--------|
| Тема (корень ветки) | `null` / не передавать | «Спасибо за тему» |
| Любой comment | UUID комментария | ответ на ответ, 3-й уровень и глубже |

**Модель данных:** `comment.parent_id` → прямой родитель; `comment_closure` — closure table для поддеревьев, promote, модерации по scope.

**GET** `/forum/topics/{id}/comments` — плоский массив `{ data: [{ id, parentId, body, … }] }`. Клиент строит дерево по `parentId` (см. [W06](../../11-ux-ui/wireframes/forum.md)).

**POST** `/forum/topics/{id}/comments` (auth):

```json
{ "body": "Согласен", "parentId": "comment-uuid" }
```

Без `parentId` — корневый комментарий к теме. Родитель **обязан** принадлежать той же теме.

**Ограничения по тарифу** (не в scaffold): `forum.author.reply.nestedEnabled` — вложенные ответы; `forum.author.thread.depthMax` — макс. глубина. См. [requirements](./requirements/README.md#-ветки-комментариев).

## ⚙️ Переменные scalar-config

| Ключ | Описание |
|------|----------|
| `forum.bannedWordsList` | Фильтр контента |
| `forum.editWindowMinutes` | Окно редактирования |
| `forum.vote.changeWindowMinutes` | Окно смены +/- голоса (0 / N / -1) |
| `forum.vote.karmaPlusWeight` / `karmaMinusWeight` | Δкармы автору за +/- (default 0.2) |
| `forum.reaction.karmaWeights` | Веса emoji-реакций для кармы |

## 💳 Переменные plan-config

См. registry секция `forum` — `postsPerDay`, `nestedRepliesEnabled`, `pushNotifications`, …

## 📨 События

| Direction | Event | Когда |
|-----------|-------|-------|
| produce | `forum.content_reported` | Report submitted |
| produce | `forum.comment_promoted_to_topic` | Moderator promote |
| consume | `rating.user_banned` | Block write |

WS (via BFF): `message.new`, `reaction.added`, `topic.promoted`.

## 🔗 Взаимодействие

| Сервис | Протокол |
|--------|----------|
| plan-config | limits, features |
| billing | платные реакции |
| rating | karma, check-ban |
| notifications | replies, digest |
| user-profile | author display |
| MinIO | `forum-attachments` |
| Keto | ownership, moderators ([moderator-mapping](../../09-security/moderator-mapping.md)) |

## 🔒 Безопасность

- Модераторы — admin assigns only ([moderator-mapping](../../09-security/moderator-mapping.md))
- Promote — moderator scope on comment/topic/category ancestor
- Guest — read public categories; write — member

## ⚙️ Окружение

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `DATABASE_URL` | да | schema `forum` |
| `RABBITMQ_URL` | да | Events |
| `REDIS_URL` | да | WS fan-out |
| `PLAN_CONFIG_URL` | да | Limits |
| `BILLING_URL` | да | Pro reactions |
| `RATING_URL` | да | check-ban, karma |
| `MINIO_*` | да | forum-attachments |

## 📎 Связанные разделы

- [knowledge-base.md](./knowledge-base.md)
- [tags.md](./tags.md)
- [requirements — полный анализ](./requirements/README.md)
- [ADR-005](../../03-architecture/adr/005-forum-terminology.md)
- [moderator-mapping](../../09-security/moderator-mapping.md)
- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

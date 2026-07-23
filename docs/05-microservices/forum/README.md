# 🗣️ Сервис: forum

> **Статус:** scaffold · **Версия:** 0.3 · **Schema:** `forum` · **Порт:** 3009  
> **Детальные требования:** [requirements/README.md](./requirements/README.md)

## 🎯 Назначение

**Форум** — категории, топики, комментарии, реакции, **Markdown**, теги, справочник клуба.

- Сущности: `topic`, `comment` ([ADR-005](../../03-architecture/adr/005-forum-terminology.md))
- **Черновики тем:** [drafts.md](./drafts.md) — `DRAFT` / `PUBLISHED`, автор-only, без unpublish
- **Knowledge base:** политики категорий ([knowledge-base.md](./knowledge-base.md))
- **Теги:** [tags.md](./tags.md)
- Интеграция: rating (karma), billing (Pro-реакции), plan-config (лимиты)
- Realtime: Redis → BFF WS `forum:{topicId}`; **TOPIC side chat** — сервис [`chat`](../chat/README.md) (`kind=TOPIC`), UI W06 — [wireframes](../../11-ux-ui/wireframes/forum.md)

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
| `category_allowed_user` | Allowlist ACL: пусто = всем; иначе userIds + admin ([category-acl.md](./category-acl.md)) |
| `topic` | Тема; `status` (`DRAFT`/`PUBLISHED`), `publishedAt`; `deletedAt` (soft-delete staff); vote counters |
| `comment` | Комментарий; `promotedTopicId`; `deletedAt`; vote counters |
| `comment_closure` | Closure table для дерева |
| `reaction` | emoji-реакции (`emojiKey`) |
| `content_vote` | +/- : `userId`+`contentId` PK, `value` ±1, `createdAt` |
| `tag` | Каталог тегов (slug, displayName, official) |
| `content_tag` | Связь tag ↔ topic (позже auction/marketplace) |
| `outbox_message` | Надёжная доставка domain events после commit |

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
| GET | `/forum/categories` | Дерево с ACL (optional JWT); admin видит `allowedUserIds` |
| GET/PUT | `/admin/forum/categories/{id}/members` | Allowlist (admin) · [category-acl.md](./category-acl.md) |
| GET/POST | `/forum/topics` | Список (published; `?status=DRAFT` — свои) / создание (`status`) |
| GET/PATCH | `/forum/topics/{id}` | Детали (+ `myVote`) / edit (автор в окне **или** admin/moderator) |
| DELETE | `/forum/topics/{id}` | Soft-delete темы (**только** admin/moderator) |
| GET | `/forum/tags` | Autocomplete `?q=` |
| GET | `/forum/tags/{slug}` | Карточка тега + topicIds |
| PUT | `/forum/topics/{id}/tags` | Заменить теги (автор **или** staff) |
| GET/POST | `/forum/topics/{id}/comments` | Ветка; GET с `myVote` при auth; удалённые — placeholder |
| PATCH | `/forum/topics/{id}/comments/{commentId}` | Edit (автор в окне **или** staff) |
| DELETE | `/forum/topics/{id}/comments/{commentId}` | Soft-delete комментария (**только** staff) |
| POST | `/forum/topics/{id}/comments/{commentId}/promote-to-topic` | Выделить в тему + subtree (**только** admin/moderator) |
| POST | `/forum/votes` | `{ contentId, contentType, value: 1\|-1 }` |
| POST | `/forum/votes/clear` | Снять голос |
| GET/POST | `/forum/reactions` | Список / upsert emoji (`+1`, `-1`, `heart`, `surprised`, `thinking`) |
| POST | `/forum/content/report` | Жалоба → `forum.content_reported` |

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
| produce | `tag.content_tagged` | Новый `content_tag`; запись атомарна с outbox |
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

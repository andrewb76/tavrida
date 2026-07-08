# 🗣️ Сервис: forum

> **Статус:** spec ready · **Версия:** 0.2 · **Schema:** `forum`  
> **Детальные требования:** [requirements/README.md](./requirements/README.md)

## 🎯 Назначение

**Форум** — категории, топики, комментарии, реакции, **Markdown**, теги, справочник клуба.

- Сущности: `topic`, `comment` ([ADR-005](../../03-architecture/adr/005-forum-terminology.md))
- **Knowledge base:** политики категорий ([knowledge-base.md](./knowledge-base.md))
- **Теги:** [tags.md](./tags.md)
- Интеграция: rating (karma), billing (Pro-реакции), financial-policy (лимиты)
- Realtime: Redis → BFF WS `forum:{topicId}`

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Category** | Дерево разделов |
| **Topic** | Корневое сообщение темы |
| **Comment** | Ответ в topic (дерево через closure table) |
| **Reaction** | Эмоция на `contentId` + `contentType` |
| **Promote** | Выделение comment → равноправный topic ([ADR-005](../../03-architecture/adr/005-forum-terminology.md)) |

## 🗄️ Сущности

| Таблица | Описание |
|---------|----------|
| `category` | Иерархия; `policy` jsonb (allowComments, …) |
| `topic` | Тема |
| `comment` | Комментарий; `promotedTopicId` после promote |
| `comment_closure` | Closure table для дерева |
| `reaction` | `contentId`, `contentType`, `emojiKey`, `userId` |

> DDL detail: [10-data](../../10-data/README.md)

## 🔌 API (BFF `/api/v1/forum/*`)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/forum/categories` | Дерево |
| GET/POST | `/forum/topics` | Список / создание |
| GET/PATCH | `/forum/topics/{id}` | Детали / edit window |
| GET/POST | `/forum/topics/{id}/comments` | Ветка |
| POST | `/forum/reactions` | `{ contentId, contentType, emojiKey }` |
| POST | `/forum/content/report` | Жалоба → `forum.content_reported` |
| POST | `/internal/.../comments/{id}/promote-to-topic` | Moderator only |

Лимиты UI → [requirements](./requirements/README.md) + [PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md).

## ⚙️ Переменные settings

| Ключ | Описание |
|------|----------|
| `forum.bannedWordsList` | Фильтр контента |
| `forum.editWindowMinutes` | Окно редактирования |
| `forum.reaction.karmaWeights` | Веса для rating karma |

## 💳 Переменные financial-policy

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
| financial-policy | limits, features |
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
| `FINANCIAL_POLICY_URL` | да | Limits |
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

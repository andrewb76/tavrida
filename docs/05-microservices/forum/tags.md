# 🏷️ Система тегов

> **Статус:** implementing · **Версия:** 0.2 · **Schema:** `forum` (+ cross-domain refs)  
> **Код:** `services/forum` — `Tag` / `ContentTag`; BFF `GET /forum/tags`; UI chips + subscribe

Теги группируют контент **форума**, позже **аукционов** и **marketplace**. Подписки на тег — [subscriptions](../subscriptions/README.md) (`targetType: TAG`, `sourceDomain: platform`).

**Архитектурное решение (2026-07-15):** отдельный taxonomy-сервис **не** выделяем, пока теги реально не живут в нескольких доменах. SoT остаётся в `forum`; подпискам нужны стабильные `tagId` + событие `tag.content_tagged`, не владение каталогом.

---

## 🎯 Назначение

| Задача | Как теги помогают |
|--------|-------------------|
| Навигация | «монеты», «керамика», «Крым» |
| Поиск / фильтры | Pro: `forum.searchFilters`, post-MVP OpenSearch facet |
| Подписки | `TAG` target в subscriptions |
| Модерация | Скрытые служебные теги (`mod:review`) |

---

## 🗄️ Модель данных

### `Tag` (`forum.tag`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `slug` | varchar unique | `krym`, `monety` (latin, url-safe; translit из RU) |
| `displayName` | varchar | «Крым», «Монеты» |
| `description` | text nullable | Для страницы тега |
| `color` | varchar nullable | UI chip |
| `isOfficial` | boolean | Seed/admin; бейдж «офиц.» |
| `isHidden` | boolean | Не в autocomplete (mod only) |
| `usageCount` | int | Denormalized counter |
| `createdAt` | timestamptz | — |

### `ContentTag` (`forum.content_tag`)

| Поле | Тип | Описание |
|------|-----|----------|
| `tagId` | UUID | PK part |
| `contentType` | varchar | `topic` \| `comment` \| `auction` \| `marketplace_listing` |
| `contentId` | UUID | PK part |
| `priority` | int nullable | Pro `forum.tagsWithPriority` |
| `addedBy` | varchar | userId |
| `createdAt` | timestamptz | — |

**PK / unique:** `(tagId, contentType, contentId)`.

### Denormalized `topic.tags` (jsonb)

Массив **slug** для списков карточек без JOIN. SoT — `Tag` + `ContentTag`. При GET topic: lazy sync legacy jsonb → formal rows.

### Связь с категориями

`category.defaultTags[]` — автоматически при создании topic в ветке ([knowledge-base.md](./knowledge-base.md)) — next.

---

## ✅ Реализовано

| Слой | Статус |
|------|--------|
| Entity `tag` + `content_tag` | ✅ |
| Seed official: krym / monety / keramika | ✅ |
| `PUT …/topics/{id}/tags` → ensure Tag + replace ContentTag | ✅ |
| Response `tagItems[]` + `addedTagIds` | ✅ |
| `GET /internal/v1/tags?q=` + `GET …/tags/:slug` | ✅ |
| BFF public same paths | ✅ |
| UI chips + autocomplete suggest + compact subscribe (bell) | ✅ |
| Forum transactional outbox → RMQ `tag.content_tagged` | ✅ |
| Subscriptions RMQ consumer → match TAG → notifications `tag-content` | ✅ (notifications mock/Novu adapter) |
| Admin POST official / merge | ⏳ |
| Auction / marketplace ContentTag | ⏳ |

---

## 🔌 API

| Method | Path | Описание |
|--------|------|----------|
| GET | `/forum/tags` | Autocomplete `?q=` |
| GET | `/forum/tags/{slug}` | Тег + до 50 `topicIds` |
| PUT | `/forum/topics/{id}/tags` | Заменить набор: body `{ tags: string[] }` (labels); ответ включает `tagItems`, `addedTagIds` |
| POST | `/forum/tags` | Admin: создать official tag — later |
| PUT | `/auctions/{id}/tags` | later |

Лимиты: сейчас UI/сервис max **10**; plan-config `forum.tagCountMax` — next wire.

Тело detail topic:

```json
{
  "tags": ["krym"],
  "tagItems": [
    { "id": "…", "slug": "krym", "displayName": "Крым", "isOfficial": true }
  ]
}
```

Подписка (уже есть CRUD):

```json
{
  "sourceDomain": "platform",
  "targetType": "TAG",
  "targetId": "<tagUUID>"
}
```

---

## 💳 plan-config

| Ключ | Free | Basic | Pro | Описание |
|------|------|-------|-----|----------|
| `forum.tagCountMax` | 3 | 10 | ∞ | Тегов на topic/лот |
| `forum.tagsWithPriority` | feature | false | false | true | Приоритет в ленте |
| `subscriptions.member.tag.max` | 3 | 10 | ∞ | Подписки на теги |

> Registry: [PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md)

---

## 📨 События

| Event | Когда | Статус |
|-------|-------|--------|
| `tag.content_tagged` | Добавлен тег к topic (`payload.tagId`) | Forum outbox + RMQ ✅ |
| → subscriptions | Live RMQ consumer, Match `TAG` | ✅ |
| → notifications | `forum` transactional outbox → RMQ → subscriptions → `tag-content` |
| → OpenSearch (post-MVP) | Index facet | — |

---

## 🖥️ UI

- Chips под заголовком topic; slug-chips в списке тем
- Autocomplete suggest при вводе; свободный ввод создаёт non-official Tag
- Колокольчик на chip → `EventSubscribeButton` compact (`platform` / `TAG`)
- **Phase 2:** member-proposed → mod approval; admin merge

---

## 🔒 Модерация

- Admin merge tags (`moneta` → `monety`) — later
- Hidden tags для internal workflows
- Banned tag slugs in settings: `forum.tags.bannedSlugs`

---

**Связано:** [knowledge-base.md](./knowledge-base.md) · [subscriptions](../subscriptions/README.md) · [ADR-008](../../03-architecture/adr/008-opensearch-full-text.md)

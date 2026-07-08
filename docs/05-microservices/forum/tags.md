# 🏷️ Система тегов

> **Статус:** spec ready · **Версия:** 0.1 · **Schema:** `forum` (+ cross-domain refs)

Теги группируют контент **форума**, **аукционов** (лоты), позже **marketplace**. Подписки на тег — [subscriptions](../subscriptions/README.md).

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
| `slug` | varchar unique | `krym`, `monety` (latin, url-safe) |
| `displayName` | varchar | «Крым», «Монеты» |
| `description` | text nullable | Для страницы тега |
| `color` | varchar nullable | UI chip |
| `isOfficial` | boolean | Создан admin; синий бейдж |
| `isHidden` | boolean | Не в autocomplete (mod only) |
| `usageCount` | int | Denormalized counter |
| `createdAt` | timestamptz | — |

### `ContentTag` (`forum.content_tag`)

| Поле | Тип | Описание |
|------|-----|----------|
| `tagId` | UUID | FK |
| `contentType` | enum | `topic` \| `comment` \| `auction` \| `marketplace_listing` |
| `contentId` | UUID | — |
| `priority` | int nullable | Pro `forum.tagsWithPriority` |
| `addedBy` | UUID | userId |
| `createdAt` | timestamptz | — |

**Unique:** `(tagId, contentType, contentId)`.

### Связь с категориями

`category.defaultTags[]` — автоматически при создании topic в ветке ([knowledge-base.md](./knowledge-base.md)).

---

## 🔌 API

| Method | Path | Описание |
|--------|------|----------|
| GET | `/forum/tags` | Autocomplete `?q=` |
| GET | `/forum/tags/{slug}` | Страница тега + контент |
| POST | `/forum/tags` | Admin: создать official tag |
| PUT | `/forum/topics/{id}/tags` | Заменить набор тегов topic |
| PUT | `/auctions/{id}/tags` | BFF → auction internal (mirror ContentTag) |

Лимиты: `forum.tagCountMax` (FP) на один объект.

---

## 💳 Financial-policy

| Ключ | Free | Basic | Pro | Описание |
|------|------|-------|-----|----------|
| `forum.tagCountMax` | 3 | 10 | ∞ | Тегов на topic/лот |
| `forum.tagsWithPriority` | feature | false | false | true | Приоритет в ленте |

> Registry: [PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md)

---

## 📨 События

| Event | Когда |
|-------|-------|
| `forum.content_tagged` | Добавлен тег к topic/comment |
| `auction.content_tagged` | Тег на лот (producer auction или forum sync) |
| → subscriptions | Match `TAG` targets |
| → OpenSearch (post-MVP) | Index facet update |

---

## 🖥️ UI

- Chips под заголовком topic / на карточке лота
- Autocomplete при создании (official + user не создаёт slug на MVP — только выбор из списка + suggest admin)
- **Phase 2:** member-proposed tags → mod approval queue

---

## 🔒 Модерация

- Admin merge tags (`moneta` → `monety`)
- Hidden tags для internal workflows
- Banned tag slugs in settings: `forum.tags.bannedSlugs`

---

**Связано:** [knowledge-base.md](./knowledge-base.md) · [subscriptions](../subscriptions/README.md) · [ADR-008](../../03-architecture/adr/008-opensearch-full-text.md)

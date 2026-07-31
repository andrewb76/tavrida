# W05–W06 — Форум

> **Термины:** [ADR-005](../../03-architecture/adr/005-forum-terminology.md) — topic + comment

---

## W05a — Главная форума (дерево разделов)

**Route:** `/forum` · **ID:** W05a · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Tree | Expand/collapse ▸/▾ (default: развёрнуто) | localStorage `tavrida.forum.treeCollapsed` |
| Counts | «N тем · M комментариев» | Per-node (не subtree); refresh: focus/visibility + ~30s poll |
| Category click | Title | → `/forum/topics?categoryId=` |
| Filters | Search `q` + select категории | Submit → `/forum/topics?…` |
| Links | Новая тема · Мои черновики · Управление разделами (admin) | |

**States:** empty tree · loading · error.

**API:** `GET /forum/categories` (`topicCount`, `commentCount` на узле)

Админ-CRUD дерева: `/forum/categories` (ссылка «← К форуму»).

### ASCII

```
┌─────────────────────────────────────┐
│ Форум          [Новая тема]         │
├─────────────────────────────────────┤
│ [поиск……] [раздел ▼] [Найти темы] │
├─────────────────────────────────────┤
│ ▾ Общее                             │
│   3 темы · 10 комментариев          │
│   ▾ Находки                         │
│     1 тема · 2 комментария          │
└─────────────────────────────────────┘
```

### Component tree

```yaml
ForumHomePage:
  - FilterBar
  - CategoryTree
      - CategoryTreeNode (expand, counts)
```

---

## W05b — Список тем

**Route:** `/forum/topics` · query: `categoryId`, `q`, `status=DRAFT` · **ID:** W05b · **MVP:** ✅

Старые закладки `/forum?categoryId=` / `?status=DRAFT` / `?q=` → redirect на `/forum/topics` с теми же query.

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Back | «← К разделам форума» | → `/forum` |
| List | Pin, title, excerpt, meta | |
| Filters (query) | category · search · drafts | Chips «× сбросить» |
| FAB | Новая тема | |
| Drafts | «Мои черновики» | `GET /forum/topics?status=DRAFT` ([drafts.md](../../05-microservices/forum/drafts.md)) |

**States:** empty category · empty search · loading · error · empty drafts.

**API:** `GET /forum/topics` (`?categoryId`, `?q`, `?status=DRAFT`), `GET /forum/categories`

### ASCII

```
┌─────────────────────────────────────┐
│ ← К разделам форума                 │
│ Темы               [Новая тема]     │
├─────────────────────────────────────┤
│ 📌 Topic title                      │
│ excerpt · author                    │
│ ─────────────────────────────────── │
│ Topic title …                       │
└─────────────────────────────────────┘
```

### Component tree

```yaml
ForumTopicListPage:
  - BackToSections
  - TopicList
      - TopicListItem
          - PinnedBadge
          - TopicTitleLink
          - TopicExcerpt
          - TopicMeta
  - CreateTopicFab
```

---

## W06 — Страница темы

**Route:** `/forum/topics/:id` · **ID:** W06 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Body | Markdown topic | |
| Reactions | 👍 👎 ❤️, Pro paid menu | Charge 50–100₽ |
| Comments | Nested tree — ответ на тему **и** на любой comment | Depth per plan-config; см. [ветки](../../05-microservices/forum/README.md#-ветки-комментариев) |
| Composer | New comment (к теме) / reply (к comment) | Auth required; `parentId` в POST |
| Pro chat | Split panel (desktop) | `forum.topicChatEnabled` |
| Mod actions | Pin, hide, promote | [moderator-mapping](../../09-security/moderator-mapping.md) |

**States:** locked topic · deleted · report submitted · **draft** (бейдж; без комментариев; «Опубликовать»).

**API / WS:** `GET/POST comments`, PATCH publish, WS `forum:{topicId}` (`message.new`, `reaction.added`, `topic.promoted`).

Черновики: [drafts.md](../../05-microservices/forum/drafts.md).

### ASCII

```
┌─────────────────────────────────────┐
│ Topic title                         │
│ Markdown body …                     │
│ 👍 12  👎 1  ❤️ 3  [Pro reactions ▼]│
├─────────────────────────────────────┤
│ Comment tree                        │
│  └ reply                            │
├─────────────────────────────────────┤
│ [ Написать комментарий… ]           │
├─────────────────────────────────────┤
│ Pro: Chat panel (desktop split)     │
└─────────────────────────────────────┘
```

### Component tree

```yaml
ForumTopicPage:
  - AppHeader
  - TopicView
      - TopicTitle
      - MarkdownBody
      - ReactionBar
      - PaidReactionMenu
  - CommentThread
      - CommentNode (recursive)
  - CommentComposer
  - TopicChatPanel (Pro, desktop)
  - ModeratorToolbar
  - AppBottomNav
```

### 🔗 Docs

- [forum service](../../05-microservices/forum/README.md)
- [requirements](../../05-microservices/forum/requirements/README.md)

---

## W14 — Новая тема

**Route:** `/forum/new` · **ID:** W14 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Header | «Новая тема», «Отмена» | → back `/forum` (дерево разделов) |
| Form | Категория, заголовок, тело (Markdown) | Category required |
| Preview | Toggle preview (optional) | Client-side render |
| Limits | Posts remaining today | `postsPerDay` counter |
| Submit | «Опубликовать» | Paywall if over limit → W16 |

**States:** validation errors · limit reached · success redirect.

**Roles:** Member; category policies per forum requirements.

**API:** `POST /forum/topics` → redirect `/forum/topics/:id`

### ASCII

```
┌─────────────────────────────────────┐
│ ← Новая тема              [Отмена]  │
├─────────────────────────────────────┤
│ Категория: [ Обсуждения      ▼ ]    │
│ Заголовок                             │
│ ┌─────────────────────────────┐     │
│ │ Markdown body…              │     │
│ └─────────────────────────────┘     │
│ Осталось тем сегодня: 1/2           │
│ [        Опубликовать             ]   │
└─────────────────────────────────────┘
```

### Component tree

```yaml
CreateTopicPage:
  - AppHeader
  - CreateTopicForm
      - CategorySelect
      - TopicTitleInput
      - MarkdownEditor
      - MarkdownPreviewToggle
      - DailyPostLimitHint
      - SubmitButton
  - AppBottomNav
```

---

**IDs:** W05a, W05b, W06, W14

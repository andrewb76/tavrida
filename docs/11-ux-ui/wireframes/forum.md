# W05–W06 — Форум

> **Термины:** [ADR-005](../../03-architecture/adr/005-forum-terminology.md) — topic + comment

---

## W05 — Список тем

**Route:** `/forum` · `/forum/categories/:id` · **ID:** W05 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Categories | Tree / drawer (mobile) | Filter by category |
| Sort | recent, active, pinned | Query param |
| List | Pin, title, excerpt, meta | Cursor «Ещё» |
| FAB | Новая тема | Limit `postsPerDay` counter |
| Limits UI | Posts remaining | On create |

**States:** empty category · loading · error.

**API:** `GET /forum/topics`, `GET /forum/categories`

### ASCII

```
┌─────────────────────────────────────┐
│ ☰ Categories    Sort: recent ▼      │
├─────────────────────────────────────┤
│ 📌 Topic title                      │
│ excerpt · author · 12 comments      │
│ ─────────────────────────────────── │
│ Topic title …                       │
│ [Ещё]                               │
│                            [+] FAB  │
└─────────────────────────────────────┘
```

### Component tree

```yaml
ForumTopicListPage:
  - AppHeader
  - CategoryDrawer
  - TopicSortBar
  - TopicList
      - TopicListItem
          - PinnedBadge
          - TopicTitleLink
          - TopicExcerpt
          - TopicMeta
  - LoadMoreButton
  - CreateTopicFab
  - AppBottomNav
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

**States:** locked topic · deleted · report submitted.

**API / WS:** `GET/POST comments`, WS `forum:{topicId}` (`message.new`, `reaction.added`, `topic.promoted`).

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
| Header | «Новая тема», «Отмена» | → back `/forum` |
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

**IDs:** W05, W06, W14

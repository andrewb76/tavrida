# W05–W06 — Форум

> **Термины:** [ADR-005](../../03-architecture/adr/005-forum-terminology.md) — topic + comment

## Список

**Route:** `/forum` · `/forum/categories/:id`

```
┌─────────────────────────────────────┐
│ Categories tree (drawer mobile)     │
├─────────────────────────────────────┤
│ Sort: recent | active | pinned      │
│ ┌─────────────────────────────────┐ │
│ │ Pin 📌 Topic title              │ │
│ │ excerpt · author · 12 comments  │ │
│ └─────────────────────────────────┘ │
│ [Ещё]                               │
│ FAB: новая тема                     │
└─────────────────────────────────────┘
```

Limits UI: show `postsPerDay` counter for author when creating.

---

## Тема

**Route:** `/forum/topics/:id`

```
┌─────────────────────────────────────┐
│ Topic body (markdown)                 │
│ Reactions bar 👍 👎 ❤️ + Pro menu   │
├─────────────────────────────────────┤
│ Comment tree (nested if plan)         │
│  └ reply                            │
├─────────────────────────────────────┤
│ Composer (auth)                       │
├─────────────────────────────────────┤
│ Pro: Chat panel (split view desktop)  │
└─────────────────────────────────────┘
```

| Feature | UI |
|---------|-----|
| Realtime | WS `forum:{topicId}` — `message.new`, `reaction.added`, `topic.promoted` |
| Edit window | «Редактировать» до 10 min ([settings](../../05-microservices/settings/README.md)) |
| Report | «Пожаловаться» → `POST …/content/report` |
| Moderator | Pin, hide, promote comment → topic ([requirements](../../05-microservices/forum/requirements/README.md)) |
| Paid reaction | Pro picker → confirm charge 50–100₽ |

**Promote (mod):** marker comment in old topic + link to new topic (algorithm A).

## 🔗 Docs

- [forum service](../../05-microservices/forum/README.md)
- [moderator-mapping](../../09-security/moderator-mapping.md)

---

**IDs:** W05, W06

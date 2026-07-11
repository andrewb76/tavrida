# W15–W16 — Оверлеи (Inbox, Paywall)

> **Паттерны:** cross-cutting UI — не отдельные routes, но самостоятельные UX-сценарии.

---

## W15 — Центр уведомлений (Inbox)

**Route:** overlay (bell в header) · **ID:** W15 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Trigger | Bell icon + unread badge | Header на всех member-страницах |
| Panel | Novu Inbox drawer / popover | Desktop: dropdown; mobile: full-screen sheet |
| Tabs | Все · Аукционы · Форум · Система | Filter by tag (optional v1) |
| List | Title, excerpt, time, read state | Mark read on open |
| Actions | «Прочитать все», settings link | → notification prefs (TBD) |
| Item click | Deep link | `/auctions/:id`, `/forum/topics/:id`, feedback modal |

**States:** loading · empty · error retry.

**Roles:** Member only.

**API / SDK:** Novu Inbox component; BFF subscriber hash TBD.

### ASCII

```
┌─────────────────────────────────────┐
│ 🔔 (3)  ← click                     │
├─────────────────────────────────────┤
│ Уведомления          [Прочитать все]│
│ ─────────────────────────────────── │
│ ● Ставка перебита · Лот #42 · 2m    │
│ ○ Новый комментарий · тема … · 1h   │
│ ○ Оставьте отзыв · сделка … · 1d    │
│ [Ещё]                               │
└─────────────────────────────────────┘
```

### Component tree

```yaml
NotificationInbox:
  - NotificationBell
      - UnreadCountBadge
  - InboxPanel (Novu)
      - InboxHeader
      - NotificationList
          - NotificationItem
      - MarkAllReadButton
      - LoadMoreNotifications
```

---

## W16 — Paywall Pro-фичи

**Route:** modal (global) · **ID:** W16 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Icon | Lock / Pro badge | Context from trigger |
| Title | «Нужен тариф Pro» (или Basic) | Dynamic per feature |
| Body | Что даёт upgrade, текущий лимит | plan-config key + human copy |
| CTA primary | «Посмотреть тарифы» | → `/plans` |
| CTA secondary | «Закрыть» | Dismiss |
| Balance hint | Low balance warning | Link `/wallet` if relevant |

**States:** shown on 403/limit from API or client guard.

**Triggers:** forum posts limit, search scope, promote lot, Pro reactions, marketplace listings, …

**API:** none (client); origin feature returns 403 + `feature` code.

### ASCII

```
┌─────────────────────────────────────┐
│              🔒                     │
│   Лимит тем на сегодня исчерпан     │
│   Basic: 2 темы/день · Pro: 5       │
│                                     │
│ [      Посмотреть тарифы        ]   │
│ [           Закрыть               ] │
└─────────────────────────────────────┘
```

### Component tree

```yaml
PaywallModal:
  - PaywallIcon
  - PaywallTitle
  - PaywallDescription
  - CurrentPlanHint
  - ViewPlansButton → /plans
  - DismissButton
  - LowBalanceLink (optional)
```

### 🔗 Docs

- [plan-config](../../05-microservices/plan-config/README.md)
- [design-tokens — Modal](../design-tokens.md)

---

**IDs:** W15, W16

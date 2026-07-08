# W09 — Маркет услуг

> **Route:** `/marketplace` · **MVP:** v1.1 (после core auction+forum)

## Список услуг

```
┌─────────────────────────────────────┐
│ Filters: category | price           │
├─────────────────────────────────────┤
│ Service cards: photo, title, price  │
│ provider rating                     │
└─────────────────────────────────────┘
```

Free plan: CTA «Стать поставщиком» → `/plans` (listingsMax=0 on Free).

## Страница услуги

```
┌─────────────────────────────────────┐
│ Gallery portfolio carousel          │
│ Description · price · provider      │
│ [Заказать]                          │
└─────────────────────────────────────┘
```

Order flow: modal agree price → `POST /marketplace/orders` → status tracker.

## Provider dashboard (same app)

**Route:** `/marketplace/my-listings`

CRUD listings + portfolio upload (MinIO).

## 🔗 Docs

- [marketplace service](../../05-microservices/marketplace/README.md)
- [platform-for-users — маркет](../../01-goal/platform-for-users.md)

---

**ID:** W09

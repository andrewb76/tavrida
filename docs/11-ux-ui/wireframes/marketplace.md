# W09 — Маркет услуг

> **MVP:** v1.1 · **Сервис:** [marketplace](../../05-microservices/marketplace/README.md)

---

## W09 — Список услуг

**Route:** `/marketplace` · **ID:** W09 · **MVP:** ⏳ v1.1

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Filters | category, price | Query params |
| Cards | photo, title, price, provider rating | Pagination |
| CTA | «Стать поставщиком» | Free → `/plans` (listingsMax=0) |

**States:** empty · loading.

**API:** `GET /marketplace/listings`

### ASCII

```
┌─────────────────────────────────────┐
│ Filters: category | price           │
├─────────────────────────────────────┤
│ [img] Реставрация монет             │
│ от 2 000 ₽ · ★ provider             │
│ ─────────────────────────────────── │
│ [img] Экспертиза …                  │
└─────────────────────────────────────┘
```

### Component tree

```yaml
MarketplaceListPage:
  - MarketplaceFilterBar
  - ServiceListingCardGrid
      - ServiceListingCard
  - BecomeProviderCta
  - AppBottomNav
```

---

## W09 — Страница услуги

**Route:** `/marketplace/:id` · **ID:** W09 · **MVP:** ⏳ v1.1

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Gallery | Portfolio carousel | MinIO |
| Info | Description, price, provider | → profile |
| CTA | «Заказать» | Modal → `POST /marketplace/orders` |

**API:** `GET /marketplace/listings/:id`, `POST /marketplace/orders`

### ASCII

```
┌─────────────────────────────────────┐
│ [ Portfolio gallery ]               │
│ Реставрация серебра                 │
│ 2 000 ₽ · provider ★4.9             │
│ Description …                       │
│ [         Заказать услугу         ] │
└─────────────────────────────────────┘
```

### Component tree

```yaml
ServiceDetailPage:
  - PortfolioGallery
  - ServiceTitle
  - ProviderChip
  - ServiceDescription
  - PriceLabel
  - OrderServiceButton → OrderModal
```

---

## W09 — Мои объявления (provider)

**Route:** `/marketplace/my-listings` · **ID:** W09 · **MVP:** ⏳ v1.1

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| List | Own listings CRUD | plan-config `listingsMax` |
| Upload | Portfolio per listing | MinIO |

### ASCII

```
┌─────────────────────────────────────┐
│ Мои услуги              [+ Новая]   │
├─────────────────────────────────────┤
│ Listing row · edit · archive        │
└─────────────────────────────────────┘
```

### Component tree

```yaml
MyListingsPage:
  - ListingManageList
      - ListingRowActions
  - CreateListingFab
```

---

## W09 — Modal: заказ услуги

**Route:** modal (на `/marketplace/:id`) · **ID:** W09 · **MVP:** ⏳ v1.1

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Context | Услуга, поставщик, базовая цена | From listing page |
| Notes | Комментарий к заказу | Optional |
| Confirm | «Оформить заказ» | `POST /marketplace/orders` |
| Errors | Low balance, limit | Link wallet / plans |

**States:** submitting · success redirect to order/chat TBD.

**API:** `POST /marketplace/orders`

### ASCII

```
┌─────────────────────────────────────┐
│ Заказ услуги                        │
│ Реставрация серебра · 2 000 ₽       │
│ Комментарий …                       │
│ [        Оформить заказ           ]   │
└─────────────────────────────────────┘
```

### Component tree

```yaml
OrderServiceModal:
  - ServiceOrderSummary
  - OrderNotesField
  - ConfirmOrderButton
  - OrderErrorBanner
```

### 🔗 Docs

- [platform-for-users — маркет](../../01-goal/platform-for-users.md)

---

**ID:** W09

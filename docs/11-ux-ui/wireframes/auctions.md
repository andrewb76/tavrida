# W02–W04 — Аукционы

> **Сервис:** [auction](../../05-microservices/auction/README.md) · **Лимиты:** [financial-features](../../05-microservices/auction/requirements/financial-features.md)

---

## W02 — Каталог лотов

**Route:** `/auctions` · **ID:** W02 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Filters | category, status, sort, search | Query params; `searchScope` per tariff |
| Grid | Card: img, title, price, badges | Cursor pagination «Ещё» |
| Badges | Live 🔴, Promoted ↑ | `status=ACTIVE`, `promotedUntil` |
| FAB | «+» | → `/auctions/new`; hide if daily limit |

**States:** loading · empty · end of list.

**API:** `GET /api/v1/auctions?cursor=&limit=20`

### ASCII

```
┌─────────────────────────────────────┐
│ Filters: category | status | sort   │
├─────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │ img  │ │ img  │ │ img  │  grid   │
│ │ title│ │ title│ │ title│         │
│ │ price│ │ 🔴Live│ │ price│         │
│ └──────┘ └──────┘ └──────┘         │
│ [Ещё]                               │
│                            [+] FAB  │
└─────────────────────────────────────┘
```

### Component tree

```yaml
AuctionCatalogPage:
  - AppHeader
  - AuctionFilterBar
  - AuctionCardGrid
      - AuctionCard
          - LotThumbnail
          - LiveBadge
          - PromotedBadge
          - PriceLabel
  - LoadMoreButton
  - CreateAuctionFab → /auctions/new
  - AppBottomNav
```

---

## W03 — Страница лота

**Route:** `/auctions/:id` · **ID:** W03 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Gallery | Swipe photos | CDN MinIO |
| Meta | Title, seller chip, category | → profile |
| Status | Timer, price, bid count, Live | WS + countdown |
| Tabs | Описание \| Ставки \| Экспертиза | Lazy load |
| Bid list | History | WS `bid.placed` prepend |
| Sticky CTA | «Сделать ставку» | Modal → POST bid |
| Owner | Edit, Promote, Cancel | seller only |
| Pro | Forum topic link | paywall |

**States:** loading · active · ending soon · ended · 402/403/429 errors.

**API / WS:** `GET /auctions/:id`, `GET …/bids`, WS `auction:{id}`.

### ASCII

```
┌─────────────────────────────────────┐
│ ← Lot #1842              🔔        │
├─────────────────────────────────────┤
│ [ Gallery swipe · ● ○ ○ ]           │
│ Title · 👤 seller ★4.8 · category   │
├─────────────────────────────────────┤
│ 🔴 LIVE  ⏱ 02:14:33  ·  1 500 ₽    │
├─────────────────────────────────────┤
│ [ Описание ] [ Ставки ] [ Эксперт ] │
│ (tab content)                       │
├─────────────────────────────────────┤
│ [      Сделать ставку  1 550 ₽   ]  │
└─────────────────────────────────────┘
```

### Component tree

```yaml
LotPage:
  - AppHeader
  - LotGallery
  - LotHeader
      - LotTitle
      - SellerChip
      - CategoryBadge
  - LotStatusBar
      - LiveBadge
      - CountdownTimer
      - CurrentPrice
      - BidCount
  - LotTabs
      - LotDescription
      - BidHistoryList
      - ExpertAppraisalList
  - LotOwnerActions
  - ForumLinkBlock
  - StickyBidBar
      - BidButton → BidModal
  - AppBottomNav
```

---

## W03 — Modal: ставка на лот

**Route:** modal (на `/auctions/:id`) · **ID:** W03 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Context | Лот, текущая цена, min next bid | From parent page |
| Input | Сумма (step validated) | Quick chips +1 step |
| Confirm | «Подтвердить ставку» | POST bid |
| Errors | 402 low balance, 403 banned, 429 rate | Inline + link wallet |

**States:** submitting · success (close + WS update) · error.

**API:** `POST /auctions/:id/bids`

### ASCII

```
┌─────────────────────────────────────┐
│ Ставка на лот                       │
│ Текущая: 1 500 ₽ · min: 1 550 ₽     │
│ ┌─────────────────────────────┐     │
│ │ 1 550                       │     │
│ └─────────────────────────────┘     │
│ [+50] [+100] [+500]                 │
│ [      Подтвердить ставку         ]   │
└─────────────────────────────────────┘
```

### Component tree

```yaml
BidModal:
  - BidModalHeader
  - CurrentPriceSummary
  - BidAmountInput
  - BidQuickIncrementChips
  - ConfirmBidButton
  - BidErrorBanner
  - LowBalanceLink → /wallet
```

---

## W04 — Создание лота

**Route:** `/auctions/new` · **ID:** W04 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Step 1 | Photo upload | MinIO presign |
| Step 2 | Title, description, category | Validation |
| Step 3 | Type (English / Dutch per plan) | FP check |
| Step 4 | Start price, increment, schedule | |
| Step 5 | Reserve (Pro+100₽), promote checkbox | Optional charges |
| Submit | Create | Show `auctionsCreatedPerDay` remaining |

**States:** draft validation errors · limit reached · success redirect.

**API:** `POST /api/v1/auctions` → redirect `/auctions/:id`

### ASCII

```
┌─────────────────────────────────────┐
│ ← Новый лот                         │
├─────────────────────────────────────┤
│ 1. Фото [+ upload]                  │
│ 2. Название · описание · категория  │
│ 3. Тип: English ▼                   │
│ 4. Цена · шаг · даты                │
│ 5. ☐ Резерв  ☐ Продвижение          │
├─────────────────────────────────────┤
│ Осталось лотов сегодня: 2/3         │
│ [        Создать аукцион          ] │
└─────────────────────────────────────┘
```

### Component tree

```yaml
CreateLotPage:
  - AppHeader
  - CreateLotForm
      - PhotoUploadStep
      - LotDetailsStep
      - AuctionTypeSelect
      - PricingScheduleStep
      - OptionalPaidFeaturesStep
      - DailyLimitHint
      - SubmitButton
```

### 🔗 Docs

- [format-lab W03 reference](./format-lab/W03-lot-page-formats.md)

---

**IDs:** W02, W03, W04

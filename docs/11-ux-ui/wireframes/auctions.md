# W02–W04 — Аукционы

> **Маршруты:** `/auctions`, `/auctions/:id`, `/auctions/new`

## Каталог

**Route:** `/auctions`

```
┌─────────────────────────────────────┐
│ Filters: category | status | sort   │
├─────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │ img  │ │ img  │ │ img  │  grid   │
│ │ title│ │ title│ │ title│         │
│ │ price│ │ 🔴Live│ │ price│         │
│ └──────┘ └──────┘ └──────┘         │
│ [Ещё] cursor pagination             │
└─────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| Filter bar | Query params; `searchScope` per tariff (title vs full) |
| Live badge | `status=ACTIVE`, pulse animation |
| Promoted | «↑» badge if `promotedUntil > now` |
| FAB «+» | → `/auctions/new` (auth); hide if daily limit reached |

**API:** `GET /api/v1/auctions?cursor=&limit=20`

---

## Страница лота

**Route:** `/auctions/:id`

```
┌─────────────────────────────────────┐
│ Gallery (swipe)                     │
│ Title · seller avatar · rating      │
│ Timer: 02:14:33 · current 1 500 ₽   │
├─────────────────────────────────────┤
│ [Сделать ставку]  (sticky mobile)   │
├─────────────────────────────────────┤
│ Tabs: Описание | Ставки | Экспертиза│
│ Bid history (WS live)               │
├─────────────────────────────────────┤
│ Pro: [Обсуждение лота → forum topic]│
└─────────────────────────────────────┘
```

| Interaction | Detail |
|-------------|--------|
| Bid button | Modal: amount step, confirm; `POST …/bids` |
| WS | Subscribe `auction:{id}` → `bid.placed`, `auction.ended` |
| Timer | Client countdown to `endsAt`; sync on WS |
| Expert tab | `GET …/expert-appraisals` |
| Owner actions | Edit (DRAFT), Promote (200₽), Cancel |

**Errors:** 402 insufficient (wallet link), 403 limit, 429 rate limit

---

## Создание лота

**Route:** `/auctions/new`

Wizard steps (single page scroll mobile):

1. Фото (MinIO upload presign)
2. Title, description, category
3. Type (English default; Dutch if plan allows)
4. Starting price, increment, schedule
5. Optional: reserve (Pro + 100₽), promote checkbox

Pre-submit: show limit `auctionsCreatedPerDay` remaining.

**API:** `POST /api/v1/auctions` → redirect to lot page

## 🔗 Docs

- [auction service](../../05-microservices/auction/README.md)
- [financial-features](../../05-microservices/auction/requirements/financial-features.md)

---

**IDs:** W02, W03, W04

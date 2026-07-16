# 📋 WORK-PLAN-NEXT — неделя: auction MVP (bids + close + RMQ)

> **Статус:** living · **Дата:** 2026-07-16 · **Горизонт:** 3–4 рабочих дня  
> **Фокус:** ставки, завершение лота, domain events  
> **Очередь:** [AGENT-TODO.todo](../../AGENT-TODO.todo) · **Индекс:** [AGENT-DOCS-INDEX.md](./AGENT-DOCS-INDEX.md)

**Предыдущая неделя (закрыта):** renew/run + Swarm renew · `invitation.redeemed` · Novu compose (onboarding deferred) · tariff Seller/Buyer proposal (discussion).

---

## 1. Snapshot

| | |
|---|---|
| **Auction сейчас** | Catalog list/get/create + seed + FE pages; **bid = mock**; нет close/RMQ/`winnerId` |
| **Цель недели** | English bid flow E2E · close/run · RMQ `created` / `bid_placed` / `completed` · FE live bid |

---

## 2. План

### Day 1 — Bid + close (auction service)

- [x] Pure logic + tests: place bid (ENGLISH), close + reserve/winner
- [x] `POST /internal/v1/auctions/:id/bids`
- [x] `POST /internal/v1/auctions/:id/close` + `POST …/close/run` (due endsAt)
- [x] Entity `winnerId`; detail exposes winner

### Day 2 — RMQ + BFF + FE

- [x] Publish `auction.created` / `bid_placed` / `completed` (skip if no RABBITMQ_URL)
- [x] BFF `POST /api/v1/auctions/:id/bids`
- [x] FE: заменить mock на real placeBid + refresh

### Day 3 — Harden (если успеем)

- [x] SCHEDULED→ACTIVE при startsAt (в close/run и на bid)
- [ ] Health `/ready` с ping DB
- [x] Docs README status implementing · index sync
- [ ] (опц.) plan-config HTTP check вместо hardcoded BFF policy

### Вне скоупа

- Dutch full bid rules · Redis/WS live · billing promote charge · expert POST · periodId · migrations prod

---

## 3. DoD

| Критерий | Done when |
|----------|-----------|
| Bid | Member ставит ≥ minNextBid на ACTIVE; seller нельзя; currentPrice/bidCount обновляются |
| Close | Due лоты → ENDED; winner если reserve ok |
| Events | Три события уходят в exchange при наличии RMQ |
| FE | Кнопка ставки без «mock» |

---

**Автор:** AI session 2026-07-16 · **Версия:** 0.3 (week: auction MVP)

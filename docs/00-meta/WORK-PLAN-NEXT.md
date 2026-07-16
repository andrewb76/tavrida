# 📋 WORK-PLAN-NEXT — неделя: auction MVP (bids + close + RMQ)

> **Статус:** living · **Дата:** 2026-07-16 · **Горизонт:** 3–4 рабочих дня  
> **Фокус:** ставки, завершение лота, domain events  
> **Очередь:** [AGENT-TODO.todo](../../AGENT-TODO.todo) · **Индекс:** [AGENT-DOCS-INDEX.md](./AGENT-DOCS-INDEX.md)

**Предыдущая неделя (закрыта):** renew/run + Swarm renew · `invitation.redeemed` · Novu compose (onboarding deferred) · tariff Seller/Buyer proposal (discussion).

---

## 1. Snapshot

| | |
|---|---|
| **Auction сейчас** | Catalog + English bid + close/run + RMQ + FE live bid ✅ |
| **Цель недели** | Harden: `/ready` DB · plan-config limits · Swarm `close/run` cron ✅ |

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
- [x] Health `/ready` с ping DB
- [x] Docs README status implementing · index sync
- [x] Dev Swarm `auction-close` hourly → `POST /internal/v1/auctions/close/run`
- [x] plan-config HTTP check вместо hardcoded BFF policy

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

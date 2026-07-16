# 📋 WORK-PLAN-NEXT — неделя: Dutch bidding + auction backlog

> **Статус:** living · **Дата:** 2026-07-16 · **Горизонт:** 2–3 рабочих дня  
> **Фокус:** Dutch accept + ask step-down · дальше promote/expert/WS  
> **Очередь:** [AGENT-TODO.todo](../../AGENT-TODO.todo) · **Индекс:** [AGENT-DOCS-INDEX.md](./AGENT-DOCS-INDEX.md)

**Предыдущая неделя (закрыта):** English bid + close/run + RMQ · `/ready` · Swarm auction-close · plan-config BFF limits · ops-hygiene.

---

## 1. Snapshot

| | |
|---|---|
| **Auction сейчас** | English bid ✅ · Dutch accept + hourly ask drop ✅ · FE buy CTA ✅ |
| **Цель** | Harden Dutch (docs done) · promote billing · expert POST · WS live |

---

## 2. План

### Day 1 — Dutch MVP

- [x] Spec [dutch-bidding.md](../05-microservices/auction/requirements/dutch-bidding.md)
- [x] `validatePlaceBid` DUTCH accept (= ask) → `completeImmediately`
- [x] `placeBid` → ENDED + winner + `bid_placed` + `completed`
- [x] `close/run` Dutch ask −`bidIncrement` (floor = reserve \| step)
- [x] `minNextBid` type-aware · FE «Купить по цене»

### Дальше (backlog)

- [ ] promote billing charge
- [ ] expert POST
- [ ] Redis/WS live bids
- [ ] Dutch live clock (чаще чем hourly) — optional

### Вне скоупа

- periodId · migrations prod · tariff Seller/Buyer cascade

---

## 3. DoD (Dutch)

| Критерий | Done when |
|----------|-----------|
| Accept | Member покупает по `currentPrice`; лот сразу ENDED + winner |
| Drop | `close/run` снижает ask до floor |
| FE | CTA без English-чипов; сумма = ask |

---

**Автор:** AI session 2026-07-16 · **Версия:** 0.4 (Dutch MVP)

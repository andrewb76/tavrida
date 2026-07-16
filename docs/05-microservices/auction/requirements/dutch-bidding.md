# Dutch auction — правила ставок (MVP)

> **Статус:** implementing · **Версия:** 0.1 · **Дата:** 2026-07-16  
> **Сервис:** [auction/README.md](../README.md)

## 🎯 Модель

**Голландский аукцион (Dutch):** цена **стартует высокой** и **понижается** шагом, пока покупатель не **примет** текущую цену. Первый accept выигрывает — торги **сразу** `ENDED`.

| Поле | Смысл для Dutch |
|------|-----------------|
| `startingPrice` | Стартовый ask (высокий) |
| `currentPrice` | Текущий ask |
| `bidIncrement` | Шаг **снижения** ask |
| `reservePrice` | Пол ask (опционально); без резерва floor = `max(1, bidIncrement)` |
| `endsAt` | Дедлайн: без accept → `ENDED`, unsold |

## ✅ Ставка (accept)

`POST …/bids` с `amount`:

1. Лот `ACTIVE` (или `SCHEDULED` с прошедшим `startsAt` → activate).
2. `now < endsAt`.
3. Bidder ≠ seller.
4. `amount` ≈ `currentPrice` (ask) — отклонение не допускается.
5. Успех → одна winning bid → `status=ENDED`, `winnerId=bidder`, события `bid_placed` + `completed`.

Ошибки: `amount_mismatch` (не ask), `seller_forbidden`, `not_active`, `ended`.

## ⬇️ Снижение цены

В batch `POST /internal/v1/auctions/close/run` (hourly Swarm `auction-close`):

1. Activate due `SCHEDULED`.
2. Для каждого `ACTIVE` + `DUTCH` с `endsAt > now`:  
   `currentPrice = max(floor, currentPrice - bidIncrement)`.
3. Close due `ACTIVE` с `endsAt <= now` (без accept → unsold).

Без отдельного clock/WS в MVP: ask обновляется раз в час (или чаще при ручном `close/run`).

## 🖥️ API / UI

| Поле detail | English | Dutch |
|-------------|---------|-------|
| `minNextBid` | `currentPrice + bidIncrement` | `currentPrice` (цена accept) |
| CTA | «Сделать ставку» + чипы `+` | «Купить по цене» · сумма = ask |

## 🔗 Связанное

- plan-config: `auction.bidder.auctionTypes.allowed` (Basic/Pro)
- English bid: [auction/README.md](../README.md) · `auction-bid.logic.ts`
- Wireframes: [auctions.md](../../../11-ux-ui/wireframes/auctions.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft

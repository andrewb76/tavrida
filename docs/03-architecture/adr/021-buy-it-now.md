# ADR-021: Buy It Now (блиц-покупка)

> **Статус:** proposed · **Дата:** 2026-09-14  
> **Сервис:** `auction` · **Связано:** [ADR-016](./016-financial-policy-parameter-registration.md) · [auction README](../../05-microservices/auction/README.md)

## 🎯 Контекст

Аукционы English-типа поддерживают только аукционный торг (bidding). Владельцы лотов просят возможность установить фиксированную цену, по которой покупатель может забрать лот немедленно — аналог **Buy It Now** на eBay.

Это расширяет сценарии использования аукциона:
- срочная продажа без ожидания окончания торгов;
- покупатели, не готовые участвовать в торгах, но желающие купить по известной цене.

Legacy-система WeBid поддерживала `buy_now` — поле есть в миграционном скрипте (`scripts/migrate-auction-data.mjs:156`), но не маппится в Tavrida-схему.

### Ограничения текущего дизайна

- `POST /auctions/{id}/bids` — только ставки (`amount >= currentPrice + bidIncrement`).
- Нет поля `buyNowPrice` в `auction.auction`.
- Миграция WeBid теряет `buy_now`.

## ✅ Решение

### Модель: eBay-style temporary BIN

| Свойство | Значение |
|----------|----------|
| Тип аукциона | Только **ENGLISH** (Dutch и так подразумевает fixed price) |
| Видимость BIN-кнопки | Пока **нет ставок** (`bidCount == 0`) |
| Поведение после ставки | BIN **исчезает** → лот становится обычным аукционом |
| Завершение по BIN | Лот продан сразу, статус `ENDED`, `winnerId = buyer` |

### Ограничения цены

```
buyNowPrice >= startingPrice
buyNowPrice >= reservePrice   (если задана)
buyNowPrice > currentPrice    (если есть ставки — но BIN не виден при bidCount > 0)
```

### Изменения в сущностях

#### `Auction` (`auction.auction`)

Новое поле:

| Поле | Тип | Описание |
|------|-----|----------|
| `buy_now_price` | decimal nullable | Блиц-цена. `NULL` = без BIN |

#### `Bid` (`auction.bid`)

Без изменений. Бинарный флаг «это BIN-покупка» определяется по `amount == buyNowPrice` на момент записи.

### API

#### `POST /auctions/{id}/bids` — расширение

Текущий контракт принимает `{ "amount": number }`. Расширение:

```text
Если amount == auction.buyNowPrice И bidCount == 0 И type == ENGLISH:
  → completeImmediately: true
  → winnerId = bidderId
  → status = ENDED
  → publish auction.completed
```

Иначе — стандартная логика ставки (валидация `amount >= currentPrice + bidIncrement`).

#### `GET /auctions/{id}` — ответ

Добавить в response:
```json
{
  "buyNowPrice": 5000,
  "buyNowAvailable": true
}
```

`buyNowAvailable = true` когда:
- `buyNowPrice IS NOT NULL`
- `bidCount == 0`
- `status == ACTIVE`
- `now < endsAt`

### Валидация при создании лота (`POST /auctions`)

```text
Если type == ENGLISH И buyNowPrice задан:
  buyNowPrice >= startingPrice
  buyNowPrice >= reservePrice (если задана)
```

Если `type != ENGLISH` → `buyNowPrice` игнируется (не сохраняется).

### Plan-config параметр

Новый ключ для тарифного гейтинга:

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `auction.seller.buyNow.enabled` | feature | ✅ | ✅ | ✅ | Доступ к установке блиц-цены |

BIN — базовая функция, доступна всем планам. Параметр нужен для возможности отключения в будущем.

### Anti-sniping

Стандартный anti-sniping (продление `endsAt` при ставке в последние N минут) **не применяется** к BIN-покупке. BIN — мгновенное завершение, продление неактуально.

### Миграция WeBid

В скрипте `scripts/migrate-auction-data.mjs` поле `buy_now` из legacy-таблицы `w16_auctions` маппится в новое поле `buy_now_price`:

```text
buy_now > 0 → buy_now_price = buy_now
buy_now = 0 ИЛИ NULL → buy_now_price = NULL
```

## 🔄 Альтернативы

| Вариант | Почему не выбран |
|---------|------------------|
| **Permanent BIN** (кнопка всегда видна) | Нелогично: после ставки аукцион уже идёт, фиксированная цена смывает смысл торгов |
| **BIN + отдельный эндпоинт** (`POST /auctions/{id}/buy-now`) | Избыточно: `POST /bids` с `amount == buyNowPrice` — то же самое, меньше эндпоинтов |
| **BIN для Dutch** | Dutch и так подразумевает fixed price (set of asks); BIN там бессмыслен |
| **Резервирование BIN** (hold на N минут) | Сложность: таймер, конкуренция с bidding, UX-нерешённость. Отложено post-MVP |

## 📌 Последствия

### Сейчас (MVP)

1. **Миграция:** добавить `buy_now_price` в `auction.auction` (nullable decimal).
2. **Код auction service:**
   - Entity: новое поле `buyNowPrice`.
   - `createAuction`: валидация `buyNowPrice >= startingPrice` (+ `reservePrice` если задана).
   - `placeBid`: ветка `amount == buyNowPrice` → `completeImmediately: true`.
   - `getAuction`: поле `buyNowAvailable` в ответе.
3. **BFF:** проксировать `buyNowPrice` и `buyNowAvailable` в `GET /auctions/{id}`.
4. **Миграция WeBid:** маппинг `buy_now` → `buy_now_price` в `migrate-auction-data.mjs`.
5. **Plan-config:** зарегистрировать `auction.seller.buyNow.enabled` при старте auction service.
6. **PLATFORM-REGISTRY:** добавить строку `auction.seller.buyNow.enabled`.

### После MVP

- Anti-sniping для BIN (если потребуется).
- BIN-резервирование (hold).
- BIN + reserve price interaction: если `reservePrice` задана, но ставка ещё нет — BIN доступен только если `buyNowPrice >= reservePrice` (уже учтено).
- UI-кнопка «Купить сразу · {price}» + серая с тултипом после первой ставки.

## 🔗 Связанные документы

- [ADR-016](./016-financial-policy-parameter-registration.md) — регистрация plan variables
- [auction README](../../05-microservices/auction/README.md) — сущности, API, lifecycle
- [financial-features](../../05-microservices/auction/requirements/financial-features.md) — параметры по планам
- [PLATFORM-REGISTRY](../../05-microservices/PLATFORM-REGISTRY.md) — каталог ключей
- [migrate-auction-data.mjs](../../../scripts/migrate-auction-data.mjs) — миграция WeBid

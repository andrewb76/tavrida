# 📂 Каталог категорий платежей (referral-rewards)

> **Статус:** spec · **Версия:** 0.2  
> Админ **включает категории** через `referralRewards.enabledChargeCategories` (settings).  
> Каталог фиксирован в коде — новая категория = деплой + обновление docs.

## Принцип отбора

Реферальные выплаты начисляются **только с платежей платформе** (подписка, платные фичи).  
**Сделки между участниками (GMV)** — **вне программы** по юридическим ограничениям (см. [legal-scope.md](./legal-scope.md)).

---

## Допустимые категории (`enabledChargeCategories`)

| ID | Описание | `billing.target` (prefix / pattern) | Default в программе |
|----|----------|-------------------------------------|---------------------|
| `SUBSCRIPTION` | Активация и продление тарифа Basic/Pro | `plan-config.activate-plan:` · `plan-config.renew-plan:` | ✅ если программа вкл. |
| `AUCTION_SERVICES` | Платные услуги платформы по лоту (не цена лота) | `auction.promotion` · `auction.reservePrice` · `auction.customDurationPreset` | ❌ |
| `MARKETPLACE_SERVICES` | Платные услуги платформы по маркету (не цена заказа) | `marketplace.listingPromotion` · `marketplace.featuredPlacement` · `marketplace.listingActivation` · `marketplace.platformFee` | ❌ |
| `FORUM_REACTIONS` | Платные реакции в темах | `forum.reaction.` | ❌ |

### Пример settings

```json
{
  "referralRewards.enabledChargeCategories": ["SUBSCRIPTION", "MARKETPLACE_SERVICES"]
}
```

Правило в `referralRewards.rules` ссылается на категорию:

```json
{
  "id": "subscription-share",
  "chargeCategory": "SUBSCRIPTION",
  "trigger": "billing.charge_completed",
  "calculation": { "type": "PERCENT", "percent": 10 }
}
```

Движок: событие проходит, если `payload.target` матчит **хотя бы одну включённую** категорию **и** rule.chargeCategory входит в `enabledChargeCategories`.

---

## Запрещённые источники (не категория, не настраивается)

| Источник | Причина |
|----------|---------|
| `auction.completed` / `finalPrice` | GMV сделки buyer↔seller |
| `marketplace.order_completed` / `agreedPrice` | GMV заказа provider↔customer |
| `marketplace.orderPayment:*` | Платёж/расчёт по заказу между users (deny-list target) |
| `billing.deposit_completed` | Собственные деньги пользователя на баланс |
| Любой будущий `*.deal.*` / escrow / P2P transfer | Финансовая сторона сделки — вне платформы |

Попытка добавить такую категорию в admin UI **не предусмотрена** — жёсткий deny-list в коде сервиса.

---

## Маппинг rule → target (reference)

| chargeCategory | patterns |
|----------------|----------|
| `SUBSCRIPTION` | `plan-config.activate-plan:*`, `plan-config.renew-plan:*` |
| `AUCTION_SERVICES` | `auction.promotion`, `auction.reservePrice`, `auction.customDurationPreset` |
| `MARKETPLACE_SERVICES` | `marketplace.listingPromotion`, `marketplace.featuredPlacement`, `marketplace.listingActivation`, `marketplace.platformFee` |
| `FORUM_REACTIONS` | `forum.reaction.*` |

---

## 🔗 Связанные документы

- [legal-scope.md](./legal-scope.md)
- [referral-rewards README](../README.md)
- [PLATFORM-REGISTRY](../../PLATFORM-REGISTRY.md)

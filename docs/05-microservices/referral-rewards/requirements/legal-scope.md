# ⚖️ Юридический scope реферальной программы

> **Статус:** accepted product constraint · **Версия:** 0.1

## Решение

**Tavrida Lot не участвует в финансовой стороне сделок** между участниками (аукцион buyer↔seller, заказ marketplace provider↔customer). Платформа не escrow, не платёжный посредник сделки.

Следствие для **`referral-rewards`**:

| Допустимо | Недопустимо |
|-----------|-------------|
| % / фикс от **платежа платформе** (подписка, promotion, **платные услуги маркета** — см. `MARKETPLACE_SERVICES`) | % от **цены лота** / **суммы заказа** между users |
| Бонус inviter за приглашение (CPA) | «Комиссия с оборота» сети по сделкам |
| Начисление на **баланс клуба** | Прямой вывод реферальных средств на карту (out of scope v1) |

## Техническая фиксация

1. **Нет** consume `auction.completed`, `marketplace.order_completed` в referral-rewards.
2. **Нет** категории `DEAL_GMV` / `ORDER_PAYMENT` — только whitelist [charge-categories.md](./charge-categories.md), incl. `MARKETPLACE_SERVICES` (платформе, не заказ).
3. Deny-list target: `marketplace.orderPayment:*`, `*.deal.*`, escrow, P2P.
4. Даже при ручном редактировании `referralRewards.rules` в settings — валидатор отклоняет триггеры/категории вне whitelist.

## Репутация vs деньги

Влияние **репутации** приглашённых на inviter (`rating.referral.*`) **не затрагивается** этим ограничением — там нет денежного потока по сделкам.

## Legal review

Multi-level **денежные** выплаты (depth > 1) — отдельный legal review перед включением в prod. Глубина и коэффициенты — только через settings, default depth = 1.

---

**Связано:** [ADR-013](../../../03-architecture/adr/013-referral-rewards-service.md) · [platform-for-users](../../../01-goal/platform-for-users.md) (сделки P2P)

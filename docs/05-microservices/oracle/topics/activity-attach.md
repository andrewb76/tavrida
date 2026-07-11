# 🎯 Активность и доля платных опций

> **Группа:** C · **YAML:** `activity`

## Простыми словами

Доход зависит не только от подписок, но от **поведения**: сколько лотов создают, какой % продвигают за 200₽, сколько платных реакций на форуме.

## Примеры

| Ситуация | Параметр |
|----------|----------|
| Активные продавцы на Pro | `auctionsCreatedPerUserPerMonth.pro` = 5 |
| 10% лотов с promotion | `auctionPromotionAttachRatePercent` = 10 |
| 2 платные реакции на 100 тем | `forumPaidReactionPer100Topics` = 2 |

## Параметры (основные)

| Ключ | По планам? |
|------|------------|
| `activity.auctionsCreatedPerUserPerMonth` | free / basic / pro |
| `activity.auctionPromotionAttachRatePercent` | глобально |
| `activity.auctionReserveAttachRatePercent` | глобально |
| `activity.forumPaidReactionPer100Topics` | глобально |
| `activity.marketplaceOrdersPerUserPerMonth` | по планам |
| `activity.forumTopicsPerUserPerMonth` | по планам (новый) |

## Формула (promotion)

```
auctionsCreated[t] = Σ_plan activeUsers[plan] × auctionsPerUser[plan]
promotionEvents[t] = auctionsCreated[t] × promotionAttachRate
promotionRevenue[t] = promotionEvents[t] × price(auction.promotion)
```

## Prod

- Лимиты создания: `financial-policy` `auction.auctionsCreatedPerDay`
- Списание: `billing` target `auction.promotion`

## 🔶 Checkpoint

- [ ] Привязать attach к плану (только Pro promotion) в v1?

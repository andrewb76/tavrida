# 💵 Разовые списания (one-time)

> **Группа:** C · **YAML:** `oneTimePrices` · **Каталог:** [PLATFORM-REGISTRY](../../PLATFORM-REGISTRY.md)

## Простыми словами

Пользователь **один раз** платит за действие: продвинуть лот, поставить платную реакцию. Не подписка.

## Примеры

- 50 лотов × 10% promotion × 200₽ = **1 000₽/мес**
- Реакция 🚀 100₽ × 30 раз = **3 000₽/мес**

## Параметры

| Target | Default ₽ | enabled |
|--------|-----------|---------|
| `auction.promotion` | 200 | true |
| `auction.reservePrice` | 100 | true |
| `auction.customDurationPreset` | 50 | true |
| `forum.reaction.rocket` | 100 | true |
| `marketplace.*` | TBD | false |

Чекбокс `enabled` в UI отключает поток в прогнозе.

## Формула

```
oneTime[t] = Σ_target events[target,t] × price[target]
```

## Engine

```typescript
computeOneTimeRevenue(activity, prices, enabledTargets): number
```

## 🔶 Checkpoint

- [ ] Все forum.reaction.* или один агрегированный слайдер?

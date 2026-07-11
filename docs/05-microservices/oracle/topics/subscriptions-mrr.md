# 💳 Подписки (MRR)

> **Группа:** B · **YAML:** `subscriptions` · **Prod:** `financial-policy`

## Простыми словами

**Basic** и **Pro** — ежемесячная (или годовая) плата за больше возможностей. Это главный **повторяющийся** доход (MRR).

## Примеры

- 200 active Basic × 99₽ ≈ 19 800₽ MRR
- 20 Pro × 399₽ ≈ 7 980₽ MRR
- Годовая оплата 990₽ → в MRR учитываем 990/12 ₽/мес

## Параметры

| Ключ | Описание |
|------|----------|
| `subscriptions.basic.monthlyPrice` | ₽/мес (симуляция; TBD в prod) |
| `subscriptions.basic.yearlyPrice` | ₽/год |
| `subscriptions.pro.*` | то же |
| `cohort.autoRenewRatePercent` | доля продлений без ручного действия |
| `cohort.yearlyBillingSharePercent` | доля на годовом биллинге |

## Формула

```
mrr[t] =
  activeBasic[t] × (1 - yearlyShare) × priceBasicMonthly
+ activePro[t]    × (1 - yearlyShare) × priceProMonthly
+ activeBasicYearly[t] × (priceBasicYearly / 12)
+ activeProYearly[t]    × (priceProYearly / 12)
```

## Prod flow

1. User `POST /plans/activate`
2. FP charge `financial-policy.activate-plan:{id}`
3. Event `subscription.activated`

## API / engine

```typescript
computeMrr(activePlans, prices, yearlyShare): number
```

## Async

Автопродление в prod — CRON FP (не Oracle). Oracle **моделирует** тот же CRON формулой.

## 🔶 Checkpoint

- [ ] Утвердить placeholder 99 / 399 или оставить 0 до совещания?

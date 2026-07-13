# 👥 Приток пользователей и когорты

> **Группа:** B · **YAML:** `cohort`, `growth`

## Простыми словами

Каждый месяц приходят **новые люди**. Часть остаётся на Free, часть платит Basic/Pro. Часть платных **уходит** (churn) — перестаёт продлевать подписку.

## Примеры

- 40 регистраций/мес, 25% сразу Basic → ~10 платных стартов.
- Churn 5%/мес → из 100 Basic через год останется ~54 (упрощённо).

## Параметры

| Ключ | Описание |
|------|----------|
| `cohort.planMix.free/basic/pro` | % новичков на плане (сумма 100) |
| `cohort.monthlyChurnRatePercent` | % Basic+ → Free в месяц |
| `cohort.autoRenewRatePercent` | % с автопродлением |
| `cohort.yearlyBillingSharePercent` | % годовой оплаты |

## Формулы (v1)

```
newFree[t]   = registrations[t] × mix.free
newBasic[t]  = registrations[t] × mix.basic
newPro[t]    = registrations[t] × mix.pro

activeBasic[t] = activeBasic[t-1] × (1 - churn) + newBasic[t] - downgrades
```

(Точная модель downgrades/conversion — см. [conversion-funnel.md](./conversion-funnel.md).)

## Prod-связь

- Реальные планы: `plan-config` `UserSubscription`
- Регистрации: Logto (фаза 4 — факт из analytics)

## API

Поля body `simulate.cohort`.

## 🔶 Checkpoint

- [ ] Churn считаем только с Basic+ или отдельно Basic vs Pro?

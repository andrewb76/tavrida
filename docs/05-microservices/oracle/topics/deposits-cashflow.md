# 🏦 Пополнения баланса (cashflow)

> **Группа:** D · **YAML:** `deposits`

## Простыми словами

Когда пользователь кладёт **свои** деньги на кошелёк — это **не выручка** платформы. Но от объёма пополнений считается **комиссия эквайринга**.

## Примеры

- Средний deposit 500₽, 100 пополнений/мес → 50 000₽ оборот → 2.5% = 1 250₽ расход

## Параметры

| Ключ | Описание |
|------|----------|
| `deposits.avgAmountRub` | Средний deposit |
| `deposits.eventsPerPayingUserPerMonth` | Пополнений на платящего |
| `deposits.shareOfUsersDepositingPercent` | % users с deposit в месяц |
| `billing.minDepositAmount` | overlay из settings (min) |

## Формула

```
payingUsers[t] ≈ activeBasic + activePro + oneTime payers
depositsVolume[t] = payingUsers[t] × shareDepositing × eventsPerUser × avgAmount
processorCost[t] = depositsVolume[t] × payment_processor_percent
```

## Prod

`billing.deposit_completed` — не gross.

## 🔶 Checkpoint

- [ ] Моделировать deposits или достаточно % от gross в v1?

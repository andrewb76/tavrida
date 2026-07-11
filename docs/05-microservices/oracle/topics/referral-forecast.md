# 🌳 Реферальная программа (прогноз)

> **Группа:** D · **YAML:** `referral` · **Prod:** `referral-rewards` + settings

## Простыми словами

Если включена программа, часть **вашего** дохода уходит пригласившим. По умолчанию в Oracle **выключена** — чтобы видеть «чистый» сценарий. Флажок показывает разницу.

## Примеры

- 25% платящих пришли по инвайту → `attachRatePercent` = 25
- Выплата только с подписок → `enabledChargeCategories: [SUBSCRIPTION]`
- Дерево: я пригласил 2, они пригласили 3 → смотрим выплаты по глубине 1–3

## Параметры

| Ключ | Описание |
|------|----------|
| `referral.programEnabled` | default **false** |
| `referral.calculationModelId` | активная модель — см. [каталог](../../referral-rewards/requirements/referral-models-catalog.md) |
| `referral.models.<id>.*` | параметры выбранной модели |
| `referral.attachRatePercent` | % gross-eligible с inviter (прогноз) |
| `referral.maxDepth` | глубина выплат (как settings) |
| `referral.depthCoefficients` | множители по уровням |
| `referral.tree.avgInviteesPerInviterPerMonth` | fan-out |
| `referral.tree.branchStudyDepth` | глубина ветки для UI |
| `referral.tree.payoutDistributionByDepth` | % выплат по уровням на графике |

## Формула (упрощённо)

```
eligibleGross[t] = gross[t] × attachRate × Σ_category enabled
payout[d,t] = eligibleGross[t] × rulePercent × depthCoeff[d] × distribution[d]
referralOut[t] = Σ_d payout[d,t] + inviteeBonusEvents[t]
```

## Prod

- settings `referralRewards.*` — см. [каталог моделей](../../referral-rewards/requirements/referral-models-catalog.md)
- `calculationModelId` + `modelParams` (фаза 3) или `rules[]` (сейчас)
- credit: `billing` `referral.reward:*`

## API response

`referralByDepth: [{ depth, payout }]`

## Async в prod

`billing.charge_completed` → referral-rewards (RabbitMQ). **Oracle не слушает MQ** — только формула.

## 🔶 Checkpoint

- [x] Каталог моделей и схема `calculationModelId` — [referral-models-catalog.md](../../referral-rewards/requirements/referral-models-catalog.md)
- [x] Select модели + условные поля в Oracle UI (комбо, `referral.models[]`)
- [x] Engine v2: `computeReferralOut` по `models[]` с суммированием
- [ ] Синхронизировать `rules` из referral-rewards README в engine

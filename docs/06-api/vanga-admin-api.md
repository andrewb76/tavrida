# Vanga Admin API

> **Статус:** draft · **Auth:** JWT + Keto `admin` · **BFF:** `services/bff/src/modules/vanga/`

Admin-only endpoints для симулятора прогноза дохода. Формулы — `@tavrida/monetization-engine`.

## Endpoints

| Method | Path | Описание |
|--------|------|----------|
| `GET` | `/api/v1/admin/vanga/defaults` | YAML defaults + overlay |
| `POST` | `/api/v1/admin/vanga/simulate` | Прогноз на N месяцев |
| `POST` | `/api/v1/admin/vanga/compare` | До 3 сценариев |

## `GET /defaults`

```json
{
  "version": "0.1",
  "currency": "RUB",
  "config": { "...": "полный vanga.defaults.yaml" },
  "overlay": {
    "subscriptions.basic.monthlyPrice": 99,
    "referralRewards.globalEnabled": false,
    "referralRewards.defaultModelId": "revshare_single"
  }
}
```

## `POST /simulate`

```json
{
  "periodMonths": 12,
  "growth": { "model": "linear", "registrationsPerMonth": 40 },
  "cohort": {
    "planMix": { "free": 70, "basic": 25, "pro": 5 },
    "churnPercent": 5,
    "yearlyBillingSharePercent": 15
  },
  "referral": {
    "programEnabled": true,
    "attachRatePercent": 25,
    "models": [
      { "modelId": "revshare_single", "enabled": true, "params": { "percentOfCharge": 10 } },
      { "modelId": "bilateral_first_sub", "enabled": true, "params": { "inviterBonusRub": 300, "inviteeBonusRub": 300 } }
    ]
  },
  "costs": {
    "items": { "hosting": 8000, "salaries": 12000 },
    "manualTotalBurn": null
  }
}
```

### Response

```json
{
  "months": [
    {
      "mrr": 966.67,
      "oneTime": 0,
      "gross": 966.67,
      "referralOut": 0,
      "variableCosts": 28,
      "fixedCosts": 20000,
      "net": -19061.33,
      "cumulativeNet": -19061.33
    }
  ],
  "breakEvenMonth": null,
  "referralByDepth": [],
  "referralByModel": []
}
```

## `POST /compare`

Тело: `{ "scenarios": [ { "scenarioId": "base", ...simulateFields }, ... ] }` — макс. 3.

## Referral models

| `modelId` | `params` |
|-----------|----------|
| `revshare_single` | `percentOfCharge` |
| `revshare_multi_decay` | `percentOfCharge`, `maxDepth` |
| `cpa_first_charge` | `fixedAmountRub` |
| `bilateral_first_sub` | `inviterBonusRub`, `inviteeBonusRub` |

Несколько моделей с `enabled: true` — выплаты **суммируются** (combo).

## Связанные документы

- [engine-and-api.md](../05-microservices/vanga/topics/engine-and-api.md)
- [referral-models-catalog.md](../05-microservices/referral-rewards/requirements/referral-models-catalog.md)
- [bff/README.md](../05-microservices/bff/README.md)

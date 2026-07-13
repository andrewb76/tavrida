# 📈 Сценарии и модели роста

> **Группа:** A · **YAML:** `scenarios`, `growth`, `scenarioMultipliers`

## Простыми словами

**Сценарий** — готовый «набор настроек»: оптимистичный = больше людей и меньше отток.  
**Модель роста** — как меняется число регистраций: ровно 40/мес, ускорение или S-кривая «сначала медленно, потом взрыв, потом плато».

## Примеры

- Запуск сарафанного радио → **exponential** первые 6 мес.
- Нишевый клуб с потолком аудитории → **logistic_s_curve**, capacity 3000.
- Консервативный бюджет → preset **pessimistic**.

## Параметры

### Presets

| ID | Множители (упрощённо) |
|----|------------------------|
| `base` | ×1.0 |
| `optimistic` | регистрации ×1.5, Pro mix ×1.4, attach ×1.3, churn ×0.7 |
| `pessimistic` | регистрации ×0.6, Pro ×0.7, attach ×0.8, churn ×1.4 |

### Модели (`growth.models`)

| Модель | Параметры YAML | Формула registrations(t) |
|--------|----------------|--------------------------|
| `linear` | `registrationsPerMonth` | `R` каждый месяц |
| `exponential` | `registrationsMonth1`, `monthlyGrowthRatePercent` | `R₁ × (1+g)^(t-1)` |
| `logistic_s_curve` | `carryingCapacity`, `inflectionMonth`, `steepness` | `K / (1 + e^{-k(t-t₀)})` приращение |

## API

`POST /admin/vanga/compare`

```json
{
  "periodMonths": 12,
  "scenarios": [
    { "id": "base", "growthModel": "linear" },
    { "id": "optimistic", "preset": "optimistic", "growthModel": "exponential" }
  ]
}
```

## Функции engine (план)

```typescript
registrationsForMonth(model, params, monthIndex): number
applyScenarioMultipliers(baseAssumptions, preset): Assumptions
```

## Async

Не нужен. Compare — до 3 синхронных прогонов.

## 🔶 Checkpoint

- [ ] Достаточно 3 presets или нужны пользовательские имена?
- [ ] S-curve параметры intuitive в UI?

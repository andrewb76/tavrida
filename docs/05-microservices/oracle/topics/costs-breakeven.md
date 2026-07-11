# 📉 Затраты и окупаемость

> **Группа:** D · **YAML:** `costs`

## Простыми словами

**Burn** — сколько ₽ в месяц уходит на жизнь проекта. **Окупаемость** — в какой месяц накопленный чистый доход перестаёт быть «в минусе» относительно выбранного burn.

## Правило UI (важно)

| Действие | Эффект |
|----------|--------|
| Меняешь **статью** (хостинг, ЗП…) | Пересчёт **суммы** burn и всего P&L |
| Тянешь **общий ползунок** burn | Статьи **не** меняются; меняется только **breakEvenMonth** |

## Примеры статей

| Статья | Тип |
|--------|-----|
| `hosting` | фикс ₽/мес |
| `payment_processor_percent` | % от deposits |
| `tax_percent_of_net` | % от net revenue |
| `salaries` | фикс ₽/мес |

## Формулы

```
fixedCosts[t] = Σ items (RUB_per_month)
variableCosts[t] = deposits[t] × processor% + max(0, net[t]) × tax%
totalBurnSlider = Σ fixed (auto) OR manualOverride (только BE)

net[t] = gross[t] - referralOut[t] - variableCosts[t] - fixedCosts[t]
cumulativeNet[t] = Σ net[1..t]
breakEvenMonth = min t : cumulativeNet[t] >= 0
```

При **manual** total burn для BE: использовать `manualBurn` вместо `fixedCosts` только в пороге окупаемости (P&L месяца всё ещё по line items).

## 🔶 Checkpoint

- [ ] Уточнить: BE при manual burn — формула «cumulative net ≥ manualBurn × t» или другая?

# 📅 Период и результат прогноза

> **Группа:** A · **YAML:** `period` · **Индекс:** [topic-index](../topic-index.md#a-время-и-сценарии)

## Простыми словами

Вы выбираете, **на сколько месяцев вперёд** считать деньги: 3, 12 или 36. Ванга строит **таблицу по месяцам** и суммирует итог.

## Когда это нужно

- «Хватит ли на год при текущем burn?»
- Сравнить кварталы после запуска рекламы.

## Примеры

| Период | Вопрос |
|--------|--------|
| 6 мес | Покроем ли хостинг до лета? |
| 12 мес | Годовой бюджет для совещания |
| 24 мес | Нужен ли инвестор / найм |

## Параметры

| Ключ YAML | UI | Описание |
|-----------|-----|----------|
| `period.defaultMonths` | default | 12 |
| `period.minMonths` | min | 1 |
| `period.maxMonths` | max | 36 |
| `period.granularity` | фикс | `month` |

## Выход расчёта (`VangaResult.months[]`)

| Поле | Описание |
|------|----------|
| `monthIndex` | 1…N |
| `registrations` | Новые за месяц |
| `activeUsers` | Активная база (модель когорты) |
| `mrr` | Подписки |
| `oneTime` | Разовые |
| `gross` | mrr + oneTime |
| `referralOut` | Реферал |
| `variableCosts` | % эквайринг, налог |
| `fixedCosts` | Сумма line items |
| `net` | gross − outflows − costs |
| `cumulativeNet` | Накопленный net |

## API

`POST /admin/vanga/simulate` — поле `periodMonths: number`.

## Формулы

```
cumulativeNet[t] = cumulativeNet[t-1] + net[t]
```

## Async / сообщения

Не требуется.

## 🔶 Checkpoint

- [ ] Максимум 36 мес достаточно или нужен 60?

# 🔄 Конверсия в платные планы

> **Группа:** B · **YAML:** `conversion` (новый блок)

## Простыми словами

Не все регистрируются сразу на Basic/Pro. Многие начинают с **Free** и **позже апгрейдятся**. Конверсия — какой % free-пользователей в месяц переходит на платный план.

## Примеры

- «10% free в месяц покупают Basic после первого аукциона»
- Запуск акции → временно `freeToBasicRate` 15%

## Параметры (`config/vanga.defaults.yaml`)

| Ключ | Default | Описание |
|------|---------|----------|
| `conversion.freeToBasicMonthlyPercent` | 3% | Free → Basic в месяц |
| `conversion.freeToProMonthlyPercent` | 0.5% | Free → Pro в месяц |
| `conversion.basicToProMonthlyPercent` | 1% | Basic → Pro апгрейд |
| `conversion.trialBasicDays` | 0 | Пробный Basic (0 = нет) |

## Формула

```
upgradesToBasic[t] = activeFree[t] × freeToBasicRate
upgradesToPro[t]   = activeFree[t] × freeToProRate + activeBasic[t] × basicToProRate
```

## Prod

`POST /api/v1/plans/activate` → plan-config → billing charge.

## API

`simulate.conversion.*`

## 🔶 Checkpoint

- [ ] Нужна ли отдельная конверсия «после первого deposit»?

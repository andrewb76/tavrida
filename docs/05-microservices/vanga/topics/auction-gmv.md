# 🏷️ Продажи на аукционе (GMV)

> **Группа:** C · **YAML:** `activity.auctionSales*` · **Не доход платформы**

## Простыми словами

**GMV** — сколько денег **перешло между участниками** при продаже лота. Платформа **не забирает** этот оборот (по текущей модели). В Vanga — **справочный** слайдер: «ожидаем 15 сделок по 5000₽».

## Зачем в Vanga

- Оценить **активность** клуба.
- Связать с будущей комиссией, если business решит иначе (сейчас **не** в gross).

## Параметры

| Ключ | Описание |
|------|----------|
| `activity.auctionSalesCountPerMonth` | Число завершённых сделок |
| `activity.auctionAvgSaleAmountRub` | Средний чек сделки |

## Формула (информационно)

```
gmv[t] = salesCount[t] × avgSaleAmount
// Не входит в gross unless platformFee enabled
```

## Legal

[legal-scope](../../referral-rewards/requirements/legal-scope.md) — referral не от GMV.

## 🔶 Checkpoint

- [ ] Показывать GMV на графике отдельной линией (серый)?

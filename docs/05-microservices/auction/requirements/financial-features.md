# 💳 Функции и лимиты аукциона по планам

> **Статус:** draft · **Версия:** 0.1  
> **Обновлён:** 5 июля 2026  
> **Ответственный:** `auction`, `financial-policy`

---

## 📊 Параметры и лимиты по планам

| Параметр | Free | Basic | Pro | Описание |
|----------|------|-------|-----|----------|
| `auction.activeAuctions` | 5 | 20 | ∞ | Количество аукционов, в которых можно участвовать |
| `auction.bidsPerHour` | 20 | 100 | ∞ | Ставок в час (защита от ботов) |
| `auction.auctionsCreatedPerDay` | 3 | 10 | ∞ | Новых аукционов в сутки |
| `auction.auctionDurationMaxHours` | 72 | 336 | ∞ | Макс. длительность аукциона (часов) |
| `auction.promotionEnabled` | ❌ | ❌ | ✅ | Возможность «раскрутить» аукцион |
| `auction.reservePriceEnabled` | ❌ | ❌ | ✅ | Установка резервной цены |
| `auction.auctionTypes` | ENGLISH | ENGLISH, DUTCH | all | Доступные типы аукционов |
| `auction.customDurationPresets` | ❌ | ❌ | ✅ | Настройка шаблонов длительности |
| `auction.analyticsDashboard` | ❌ | ❌ | ✅ | Статистика по аукционам (просмотры, ставки) |

---

## 💰 Функции для активации через billing

| Функция | Платная? | Сумма | Заметки |
|---------|----------|-------|---------|
| `auction.promotion` | ✅ | 200 ₽ | Повышение видимости в списке |
| `auction.reservePrice` | ✅ | 100 ₽ | Установка минимальной цены (резерв) |
| `auction.customDurationPreset` | ✅ | 50 ₽ | Добавление шаблона (3ч, 12ч и т.д.) |

---

## 🔄 Логика проверки

1. **Создание аукциона** → BFF → `financial-policy.check(userId, 'auction.auctionsCreatedPerDay')`
2. **Вступление в аукцион** → `financial-policy.check(userId, 'auction.activeAuctions')`
3. **Активация продвижения** → `financial-policy.canUseFeature(userId, 'auction.promotionEnabled')` + `billing.charge()`

---

## 🔌 Упрощённый API для BFF

```http
POST /api/v1/limits/check
```

```json
{
  "userId": "user-uuid",
  "parameterKey": "auction.activeAuctions",
  "requestedValue": 1,
  "currentUsage": 4
}
```

```http
POST /api/v1/features/can-use
```

```json
{
  "userId": "user-uuid",
  "featureKey": "auction.promotionEnabled"
}
```

## 🔗 Связанные разделы

- [auction](../auction/README.md)
- [PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md)
- [financial-policy](../../financial-policy/README.md)
- [billing](../../billing/README.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft

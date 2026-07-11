# 💳 Функции и лимиты аукциона по планам

> **Статус:** draft · **Версия:** 0.2  
> **Обновлён:** 11 июля 2026  
> **Владелец register:** `auction` (plan-config хранит матрицу, не знает ключи до register)

Параметры ниже **документируются здесь** и **регистрируются** сервисом `auction` при старте (`POST /internal/v1/plan-variables/register`).  
До подключения auction в runtime матрица plan-config может не содержать `auction.*` — это ожидаемо.

> Модель: [ADR-016](../../03-architecture/adr/016-financial-policy-parameter-registration.md)

---

## 📊 Параметры и лимиты по планам

| Параметр | Free | Basic | Pro | Описание |
|----------|------|-------|-----|----------|
| `auction.activeAuctions` | 5 | 20 | ∞ | **Bidder:** чужих торгов, где одновременно участвуешь ставками |
| `auction.sellerActiveLots` | 2 | 5 | ∞ | **Seller:** своих лотов ACTIVE на торгах одновременно |
| `auction.bidsPerHour` | 20 | 100 | ∞ | Ставок в час (антибот) |
| `auction.auctionsCreatedPerDay` | 3 | 10 | ∞ | **Seller:** новых лотов за календарные сутки |
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

**Счётчики:** auction **сам** считает `currentUsage` (своя БД) и передаёт в `limits/check`. plan-config не хранит usage ([ADR-016](../../../03-architecture/adr/016-financial-policy-parameter-registration.md) — открытый вопрос для sliding windows).

| Действие | Роль | Параметр | Кто считает usage |
|----------|------|----------|-------------------|
| Публикация лота (ACTIVE) | seller | `auction.sellerActiveLots` | auction (COUNT lots ACTIVE) |
| Создание лота | seller | `auction.auctionsCreatedPerDay` | auction (COUNT created today) |
| Ставка / вступление в торг | bidder | `auction.activeAuctions` | auction (COUNT active participations) |
| Продвижение лота | seller | `auction.promotionEnabled` + charge `auction.promotion` | feature check only |

1. **Публикация лота** → `plan-config.check(userId, 'auction.sellerActiveLots')`
2. **Создание лота** → `plan-config.check(userId, 'auction.auctionsCreatedPerDay')`
3. **Ставка** → `plan-config.check(userId, 'auction.activeAuctions')`
4. **Продвижение** → `canUseFeature('auction.promotionEnabled')` → `GET /charges/quote?target=auction.promotion` → `billing.charge()`

> Лимит `−1` в plan-config = без ограничений.

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
- [plan-config](../../plan-config/README.md)
- [billing](../../billing/README.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft

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
| `auction.bidder.participation.activeMax` | 5 | 20 | ∞ | **Bidder:** чужих торгов, где одновременно участвуешь ставками |
| `auction.seller.lot.activeMax` | 2 | 5 | ∞ | **Seller:** своих лотов ACTIVE на торгах одновременно |
| `auction.bidder.bid.hourlyMax` | 20 | 100 | ∞ | Ставок в час (антибот) |
| `auction.seller.lot.dailyCreateMax` | 3 | 10 | ∞ | **Seller:** новых лотов за календарные сутки |
| `auction.seller.lot.durationMaxHours` | 72 | 336 | ∞ | Макс. длительность аукциона (часов) |
| `auction.seller.promotion.enabled` | ❌ | ❌ | ✅ | Возможность «раскрутить» аукцион |
| `auction.seller.reservePrice.enabled` | ❌ | ❌ | ✅ | Установка резервной цены |
| `auction.bidder.auctionTypes.allowed` | ENGLISH | ENGLISH, DUTCH | all | Доступные типы аукционов |
| `auction.seller.durationPreset.customEnabled` | ❌ | ❌ | ✅ | Настройка шаблонов длительности |
| `auction.seller.analytics.dashboardEnabled` | ❌ | ❌ | ✅ | Статистика по аукционам (просмотры, ставки) |

---

## 💰 Функции для активации через billing

| Функция | Платная? | Сумма | Заметки |
|---------|----------|-------|---------|
| `auction.seller.promotion.unitPrice` | ✅ | 200 ₽ | Повышение видимости в списке |
| `auction.seller.reservePrice.unitPrice` | ✅ | 100 ₽ | Установка минимальной цены (резерв) |
| `auction.seller.durationPreset.unitPrice` | ✅ | 50 ₽ | Добавление шаблона (3ч, 12ч и т.д.) |

---

## 🔄 Логика проверки

**Счётчики:** auction **сам** считает `currentUsage` (своя БД) и передаёт в `limits/check`. plan-config не хранит usage ([ADR-016](../../../03-architecture/adr/016-financial-policy-parameter-registration.md) — открытый вопрос для sliding windows).

| Действие | Роль | Параметр | Кто считает usage |
|----------|------|----------|-------------------|
| Публикация лота (ACTIVE) | seller | `auction.sellerActiveLots` | auction (COUNT lots ACTIVE) |
| Создание лота | seller | `auction.auctionsCreatedPerDay` | auction (COUNT created today) |
| Ставка / вступление в торг | bidder | `auction.activeAuctions` | auction (COUNT active participations) |
| Продвижение лота | seller | `auction.promotionEnabled` + charge `auction.promotion` | feature check only |

1. **Создание лота** → strict `limits/check` по
   `auction.seller.lot.dailyCreateMax`; incomplete policy → `503`.
2. **Платные опции** → strict feature + `resolve-price` → `billing.charge`
   до создания. Клиент передаёт `Idempotency-Key`; promotion/reserve получают
   отдельные производные ключи.
3. Read-only `GET /auctions/create-options` может вернуть conservative Free
   fallback с `degraded=true`, но этот результат не используется для write.
4. Active-lot, participation и hourly-bid enforcement остаются следующим
   этапом: счётчик должен резервироваться атомарно в auction domain.

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

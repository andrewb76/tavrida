# ADR-006: Переименование `feedback` → `deal-feedback`, `auction-subscriptions` → `subscriptions`

> **Статус:** accepted · **Дата:** 2026-07-09

## 🎯 Контекст

- Имя **`feedback`** слишком общее — путается с UX-feedback, forum reactions, support.
- **`auction-subscriptions`** ограничивает модель: подписки нужны для **форума**, тегов, marketplace и digest по любым доменам.

## ✅ Решение

### `deal-feedback` (отзывы о сделках)

| Слой | Было | Стало |
|------|------|-------|
| Каталог `services/` | — (docs only) | `deal-feedback/` |
| npm | `@tavrida/feedback` | `@tavrida/deal-feedback` |
| PostgreSQL schema | `feedback` | `deal_feedback` |
| Docs | `feedback/` | `deal_feedback/` |
| BFF prefix | `/api/v1/feedback` | `/api/v1/deal-feedback` (alias `/feedback` deprecated 1 release) |
| Event | `feedback.submitted` | `deal_feedback.submitted` (+ consumer alias) |

Сущности без изменения смысла: `DealFeedback`, `PendingFeedback`, `FeedbackBonus` — в schema `deal_feedback`.

### `subscriptions` (универсальные подписки)

| Слой | Было | Стало |
|------|------|-------|
| Каталог `services/` | `auction-subscriptions/` | `subscriptions/` (migrate при реализации) |
| npm | `@tavrida/auction-subscriptions` | `@tavrida/subscriptions` |
| PostgreSQL schema | `auction_subscriptions` | `subscriptions` |
| Docs | `auction_subscriptions/` | `subscriptions/` |
| BFF prefix | `/api/v1/auction-subscriptions` | `/api/v1/subscriptions` |
| Registry prefix | `auction_subscriptions.*` | `subscriptions.*` |

**Универсальная модель подписки** — см. [subscriptions/README.md](../../05-microservices/subscriptions/README.md).

## 🔄 Альтернативы

| Вариант | Почему нет |
|---------|------------|
| Оставить `feedback` | Неочевидность в коде и логах |
| `notifications` владеет подписками | Смешивает transport и intent пользователя |
| Отдельный сервис на каждый домен | Дублирование fan-out и лимитов |

## 📌 Последствия

- Обновить [naming.md](../../13-maintenance/naming.md), event-catalog, BFF routes, PLATFORM-REGISTRY.
- Код `services/auction-subscriptions/` — rename при следующем коммите в implementation phase.
- Legacy aliases в consumers 1 релиз для zero-downtime migration.

---

**Связано:** [naming.md](../../13-maintenance/naming.md) · [subscriptions](../../05-microservices/subscriptions/README.md) · [deal_feedback](../../05-microservices/deal_feedback/README.md)

# 🟡 Средние сценарии (~12%)

> **Группа:** occasional · **ID:** S-020…S-026  
> **Индекс:** [platform-scenarios.md](../platform-scenarios.md)

Монетизация, рост, маркет. Реже core loop, но **критичны для денег** — усиленный INT, saga-тесты.

## 📏 Стандарты этой группы

| | Требование |
|---|------------|
| E2E | Happy path перед релизом (не блокер каждого PR) |
| UNIT | Idempotency charge, plan price calc, subscribe limits |
| INT | **Обязателен** для billing ↔ financial-policy ↔ domain |
| SLO | Стандартные; алерт на failed charge rate |
| Registry | Каждый сценарий ↔ ключ [PLATFORM-REGISTRY](../../05-microservices/PLATFORM-REGISTRY.md) |

---

### S-020 · Пополнение кошелька

| | |
|---|---|
| **G** | amount ≥ `billing.minDepositAmount` |
| **W** | Deposit flow |
| **T** | `billing.deposit_completed` |
| **Компоненты** | `billing`, webhook (provider TBD) |
| **Тест** | INT + mock provider |

### S-021 · Подписка Basic/Pro

| | |
|---|---|
| **G** | Balance ≥ price |
| **W** | `/plans` activate |
| **T** | Charge; ACTIVE sub; `subscription.activated` |
| **Компоненты** | `financial-policy` → `billing`; RMQ |
| **Тест** | **INT saga**; E2E plans |

### S-022 · Продвижение лота (200 ₽)

| | |
|---|---|
| **G** | Own lot; `promotionEnabled` or pay |
| **W** | Promote |
| **T** | Charge `auction.promotion`; badge in catalog |
| **Компоненты** | `auction`, `billing`, FP |
| **Тест** | INT |

### S-023 · Подписка на категорию / лот

| | |
|---|---|
| **G** | Under `auction_subscriptions.*` limits |
| **W** | Subscribe |
| **T** | Notify on `auction.created` / `bid_placed` |
| **Компоненты** | `auction-subscriptions`, RMQ, `notifications` |
| **Тест** | INT fan-out |

### S-024 · Маркет: заказ услуги

| | |
|---|---|
| **G** | Listing ACTIVE; `ordersPerMonth` OK |
| **W** | Order lifecycle → COMPLETED |
| **T** | `marketplace.order_completed` → feedback (как S-015) |
| **Компоненты** | `marketplace`, `feedback`, `rating` |
| **Тест** | INT; E2E v1.1 |

### S-025 · Платная реакция Pro

| | |
|---|---|
| **W** | Paid emoji reaction |
| **T** | Charge `forum.reaction.*` |
| **Компоненты** | `forum`, `billing` |
| **Тест** | INT |

### S-026 · Приватная заметка

| | |
|---|---|
| **W** | Note on other's profile |
| **T** | Author-only visibility |
| **Компоненты** | `user-profile` |
| **Тест** | INT authz |

---

## 🔗 Wireframes

W08 (wallet/plans), W09 (marketplace) — [11-ux-ui](../../11-ux-ui/wireframes/README.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

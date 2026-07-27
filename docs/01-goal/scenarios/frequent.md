# 🟢 Частые сценарии (~85%)

> **Группа:** frequent · **ID:** S-001…S-017  
> **Индекс:** [platform-scenarios.md](../platform-scenarios.md)  
> Features (если есть): [`e2e/features/frequent/`](../../../e2e/features/frequent/)

Просмотр, core loop (ставка, пост, отзыв), вход, уведомления. **Ядро продукта** — максимальные требования к тестам и SLO.

## 📏 Стандарты этой группы

| | Требование |
|---|------------|
| E2E | Smoke в CI на PR; полный прогон nightly |
| UNIT | Любое изменение auction/forum/rating/feedback/billing rules |
| INT | S-011, S-015 обязательны в CI |
| Perf | k6: каталог + ставка ([slo](../../07-observability/slo.md)) |
| Observability | Алерты 5xx/latency на BFF paths этих сценариев |

Карточка: ID, компоненты, ссылка на feature (если есть), `e2e`, тип теста.

---

## Просмотр (member only)

> Без инвайта — только [S-001](#s-001--лендинг) (лендинг).

### S-001 · Лендинг

| | |
|---|---|
| **Актор** | Guest (Visitor) |
| **Компоненты** | Static + BFF public config |
| **Feature** | [`S-001-landing.feature`](../../../e2e/features/frequent/S-001-landing.feature) |
| **e2e** | `smoke` |
| **Тест** | E2E smoke |

### S-002 · Каталог аукционов

| | |
|---|---|
| **Актор** | Member |
| **Компоненты** | BFF → `auction`; guard `requireMember` |
| **Feature** | [`S-002-auctions-catalog.feature`](../../../e2e/features/frequent/S-002-auctions-catalog.feature) |
| **e2e** | `scaffold` |
| **Тест** | E2E smoke; INT list |

### S-003 · Страница лота

| | |
|---|---|
| **Компоненты** | `auction`, Redis, WS |
| **Feature** | [`S-003-auction-detail.feature`](../../../e2e/features/frequent/S-003-auction-detail.feature) |
| **e2e** | `scaffold` |
| **Тест** | **E2E critical**; INT GET |

### S-004 · Лента форума

| | |
|---|---|
| **Компоненты** | BFF → `forum` |
| **Feature** | — |
| **e2e** | `none` |
| **Тест** | E2E |

### S-005 · Чтение темы

| | |
|---|---|
| **Компоненты** | `forum` |
| **Feature** | — |
| **e2e** | `none` |
| **Тест** | E2E |

### S-006 · Публичный профиль

| | |
|---|---|
| **Компоненты** | `user-profile`, cache `rating` |
| **Feature** | — |
| **e2e** | `none` |
| **Тест** | E2E; INT agg |

---

## Действия (auth)

### S-010 · Вход и инвайт

| | |
|---|---|
| **Компоненты** | Logto, BFF, `user-profile`, `rating`, `notifications` |
| **Feature** | [`S-010-invite-signin.feature`](../../../e2e/features/frequent/S-010-invite-signin.feature) |
| **e2e** | `scaffold` |
| **Тест** | E2E auth + invite |

### S-011 · Ставка

| | |
|---|---|
| **Компоненты** | `auction`, plan-config, `rating`, Redis/WS |
| **Feature** | [`S-011-bid.feature`](../../../e2e/features/frequent/S-011-bid.feature) |
| **e2e** | `scaffold` (`@wip`) |
| **Тест** | **E2E + UNIT increment** |

### S-012 · Создать аукцион

| | |
|---|---|
| **Компоненты** | `auction`, plan-config, MinIO |
| **Feature** | [`S-012-create-auction.feature`](../../../e2e/features/frequent/S-012-create-auction.feature) |
| **e2e** | `scaffold` (`@wip`) |
| **Тест** | E2E; INT limit |

### S-013 · Topic / comment

| | |
|---|---|
| **Компоненты** | `forum`, plan-config, `scalar-config`, `rating` |
| **Feature** | [`S-013-forum-topic.feature`](../../../e2e/features/frequent/S-013-forum-topic.feature) |
| **e2e** | `scaffold` (`@wip`) |
| **Тест** | E2E; INT filter |

### S-014 · Реакция

| | |
|---|---|
| **Компоненты** | `forum` → `rating` |
| **Feature** | — |
| **e2e** | `none` |
| **Тест** | INT; UNIT karma |

### S-015 · Аукцион завершён → отзыв

| | |
|---|---|
| **Компоненты** | `auction`, `deal-feedback`, `notifications`, `rating` |
| **Feature** | [`S-015-deal-feedback.feature`](../../../e2e/features/frequent/S-015-deal-feedback.feature) |
| **e2e** | `scaffold` (`@wip`) |
| **Тест** | **INT chain**; E2E modal |

### S-016 · Кошелёк (просмотр)

| | |
|---|---|
| **Компоненты** | `billing` |
| **Feature** | — |
| **e2e** | `none` |
| **Тест** | E2E; INT |

### S-017 · In-app notify

| | |
|---|---|
| **Компоненты** | `notifications`, RMQ |
| **Feature** | — |
| **e2e** | `none` |
| **Тест** | INT trigger |

### Deep link · Member home

| | |
|---|---|
| **Feature** | [`S-deep-link-member-home.feature`](../../../e2e/features/frequent/S-deep-link-member-home.feature) |
| **e2e** | `scaffold` |

---

## 🔗 Wireframes

W01–W08, W10 — [11-ux-ui/wireframes](../../11-ux-ui/wireframes/README.md)

---

**Автор:** команда разработки · **Версия:** 0.3-e2e

# 🟢 Частые сценарии (~85%)

> **Группа:** frequent · **ID:** S-001…S-017  
> **Индекс:** [platform-scenarios.md](../platform-scenarios.md)

Просмотр, core loop (ставка, пост, отзыв), вход, уведомления. **Ядро продукта** — максимальные требования к тестам и SLO.

## 📏 Стандарты этой группы

| | Требование |
|---|------------|
| E2E | Smoke в CI на PR; полный прогон nightly |
| UNIT | Любое изменение auction/forum/rating/feedback/billing rules |
| INT | S-011, S-015 обязательны в CI |
| Perf | k6: каталог + ставка ([slo](../../07-observability/slo.md)) |
| Observability | Алерты 5xx/latency на BFF paths этих сценариев |

---

## Просмотр (member only)

> Без инвайта — только [S-001](#s-001--лендинг) (лендинг).

### S-001 · Лендинг

| | |
|---|---|
| **Актор** | Guest (Visitor) |
| **G** | `/` |
| **W** | Scroll, CTA «У меня есть инвайт» |
| **T** | About, rules; **нет** каталога/форума |
| **Компоненты** | Static + BFF public config |
| **Тест** | E2E smoke |

### S-002 · Каталог аукционов

| | |
|---|---|
| **Актор** | Member |
| **G** | `/auctions` |
| **W** | Фильтр / pagination |
| **T** | Карточки: цена, Live, promoted badge |
| **Компоненты** | BFF → `auction`; guard `requireMember` |
| **Тест** | E2E smoke; INT list |

### S-003 · Страница лота

| | |
|---|---|
| **G** | Лот существует |
| **W** | `/auctions/:id` |
| **T** | Gallery, timer, bids; WS `bid.placed` без reload |
| **Компоненты** | `auction`, Redis, WS |
| **Тест** | **E2E critical**; INT GET |

### S-004 · Лента форума

| | |
|---|---|
| **G** | `/forum` |
| **W** | Категория, sort |
| **T** | Topic list + meta |
| **Компоненты** | BFF → `forum` |
| **Тест** | E2E |

### S-005 · Чтение темы

| | |
|---|---|
| **G** | Topic + comments |
| **W** | `/forum/topics/:id` |
| **T** | Tree + reactions count |
| **Компоненты** | `forum` |
| **Тест** | E2E |

### S-006 · Публичный профиль

| | |
|---|---|
| **G** | `userId` |
| **W** | `/profile/:id` |
| **T** | Rating, sales; no private notes |
| **Компоненты** | `user-profile`, cache `rating` |
| **Тест** | E2E; INT agg |

---

## Действия (auth)

### S-010 · Вход и инвайт

| | |
|---|---|
| **G** | Guest; `club.registration.inviteOnly` |
| **W** | Logto OIDC → `POST /invites/redeem` |
| **T** | JWT; profile ensure; `inviterId`; referral recompute; Novu upsert |
| **Компоненты** | Logto, BFF, `user-profile`, `rating`, `notifications` |
| **Тест** | E2E auth + invite |

### S-011 · Ставка

| | |
|---|---|
| **G** | ACTIVE lot; not seller; not banned; limits OK |
| **W** | Bid ≥ current + increment |
| **T** | 201; WS; `auction.bid_placed` |
| **Компоненты** | `auction`, FP, `rating`, Redis/WS |
| **Тест** | **E2E + UNIT increment** |

### S-012 · Создать аукцион

| | |
|---|---|
| **G** | `auctionsCreatedPerDay` OK |
| **W** | Publish form |
| **T** | `auction.created`; in catalog |
| **Компоненты** | `auction`, FP, MinIO |
| **Тест** | E2E; INT limit |

### S-013 · Topic / comment

| | |
|---|---|
| **G** | `forum.postsPerDay` OK |
| **W** | POST content |
| **T** | Visible; WS `message.new` |
| **Компоненты** | `forum`, FP, `settings`, `rating` |
| **Тест** | E2E; INT filter |

### S-014 · Реакция

| | |
|---|---|
| **W** | 👍 / базовая реакция |
| **T** | Karma via `rating`; WS `reaction.added` |
| **Компоненты** | `forum` → `rating` |
| **Тест** | INT; UNIT karma |

### S-015 · Аукцион завершён → отзыв

| | |
|---|---|
| **G** | `endsAt` passed |
| **W** | Worker close + user submit feedback |
| **T** | RMQ chain → `rating` update |
| **Компоненты** | `auction`, `feedback`, `notifications`, `rating` |
| **Тест** | **INT chain**; E2E modal |

### S-016 · Кошелёк (просмотр)

| | |
|---|---|
| **W** | `/wallet` |
| **T** | Balance + tx list; WS on charge |
| **Компоненты** | `billing` |
| **Тест** | E2E; INT |

### S-017 · In-app notify

| | |
|---|---|
| **W** | Event (bid, reminder…) |
| **T** | Novu inbox + WS optional |
| **Компоненты** | `notifications`, RMQ |
| **Тест** | INT trigger |

---

## 🔗 Wireframes

W01–W08, W10 — [11-ux-ui/wireframes](../../11-ux-ui/wireframes/README.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

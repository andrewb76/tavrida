# 📛 Соглашения об именовании

> **Статус:** accepted · **Версия:** 0.1

Единые правила для repo, docs, кода, PostgreSQL, registry и events.

---

## 🗂️ Сервис (deployable)

| Контекст | Формат | Пример |
|----------|--------|--------|
| Каталог в `services/` | **kebab-case** | `auction-subscriptions/` |
| npm package | `@tavrida/{kebab-name}` | `@tavrida/auction-subscriptions` |
| Документ docs (целевой) | **kebab-case** | `docs/05-microservices/auction-subscriptions/README.md` |
| Human name | kebab или пробел | auction-subscriptions |

> **Legacy:** каталог docs `auction_subscriptions/` — переименовать в Фазе 1; до тех пор см. таблицу маппинга ниже.

---

## 🗄️ PostgreSQL

| Контекст | Формат | Пример |
|----------|--------|--------|
| Schema | **snake_case** (имя сервиса) | `auction_subscriptions`, `financial_policy` |
| Таблицы | **snake_case** | `service_order`, `comment_closure` |
| Одна БД | `tavrida_lot` | [ADR-001](../03-architecture/adr/001-database-schema-per-service.md) |

---

## ⚙️ PLATFORM-REGISTRY keys

| Контекст | Формат | Пример |
|----------|--------|--------|
| Префикс | **snake_case домена** (как schema, без дефисов) | `forum.`, `auction.`, `auction_subscriptions.` |
| Ключ | `{domain}.{parameterName}` | `auction_subscriptions.categoriesMax` |

**Не использовать** дефис в prefix: ~~`auction-subscriptions.categoriesMax`~~ → `auction_subscriptions.categoriesMax`.

---

## 📨 Events (RabbitMQ)

| Контекст | Формат | Пример |
|----------|--------|--------|
| eventType | `{domain}.{action_past}` | `auction.bid_placed`, `forum.comment_promoted_to_topic` |
| domain | snake_case, совпадает с schema/service | `auction_subscriptions` → события от сервиса используют `auction.` или отдельный prefix по ADR |

---

## 📡 WebSocket (BFF envelope)

| Контекст | Формат | Пример |
|----------|--------|--------|
| event field | `{noun}.{action}` (краткая форма) | `bid.placed`, `auction.ended` |
| Не равно RMQ 1:1 | см. [event-catalog § Realtime](../03-architecture/event-catalog.md#-realtime-ws-mapping) | |

---

## 🔐 Keto object types

| Форум | `category`, `topic`, `comment` |
| Platform | `platform:tavrida-lot` |
| Auction | `auction:{auctionId}` |

См. [ADR-005](../03-architecture/adr/005-forum-terminology.md) — **`post` deprecated**.

---

## 📋 Маппинг legacy → canonical

| Legacy | Canonical |
|--------|-----------|
| `docs/.../auction_subscriptions/` | `auction-subscriptions` (service/docs) |
| `post`, `postId` | `topic` / `comment`, `contentId` + `contentType` |
| `auction-subscriptions.*` (registry) | `auction_subscriptions.*` |
| `order`, `review` (marketplace tables) | `service_order`; отзывы — schema `feedback` |

---

## 🔗 Связанные документы

- [MICROSERVICE-SPEC.md](../05-microservices/MICROSERVICE-SPEC.md) L39
- [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md)
- [10-data/README.md](../10-data/README.md)

# 🔔 Сервис: subscriptions

> **Статус:** implementing (v2 delivery + match) · **Версия:** 0.5 · **Schema:** `subscriptions` · **Port:** 3004  
> **ADR:** [006-service-renames](../../03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md)  
> **Код:** `services/subscriptions` (`@tavrida/subscriptions`) · **Legacy:** `auction-subscriptions` deprecated

## 🎯 Назначение

**Универсальные подписки** пользователя на события платформы с доставкой через `notifications`.

Не только аукционы: **форум**, **теги**, **marketplace** (draft), digest по доменам.

## ✅ Реализовано

| Слой | Статус |
|------|--------|
| Entity `Subscription` + unique `(userId, sourceDomain, targetType, targetId)` | ✅ |
| Entity `DeliveryPreference` | ✅ |
| Internal API list/create/delete/count | ✅ |
| Internal `POST …/match`, `GET/PATCH …/delivery`, `POST …/digest/run` | ✅ |
| BFF `GET/POST/DELETE /api/v1/subscriptions` + JWT | ✅ |
| BFF `GET/PATCH /api/v1/subscriptions/delivery` + emailDigest feature gate | ✅ |
| Limit check via plan-config (`subscriptions.member.*`) | ✅ seed в `default-seed.ts` |
| Frontend subscribe toggle (тема / лот) | ✅ |
| Digest → notifications trigger | ⏳ stub (`triggered: 0`) |
| RMQ consumers → match → notifications | ⏳ next (producers ещё не публикуют) |

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Subscription** | Intent пользователя получать уведомления по target |
| **Target** | Объект подписки (категория, лот, тема, тег, …) |
| **Source domain** | Сервис-источник событий |
| **DeliveryPreference** | instant / digest / off per channel |

## 🗄️ Универсальная модель

### `Subscription` (`subscriptions.subscription`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `userId` | UUID | Подписчик |
| `sourceDomain` | enum | `auction` \| `forum` \| `marketplace` \| `platform` |
| `targetType` | enum | см. таблицу ниже |
| `targetId` | UUID nullable | ID объекта (null для global digest) |
| `options` | jsonb | Доменные флаги (см. ниже) |
| `createdAt` | timestamptz | — |

**Unique:** `(userId, sourceDomain, targetType, targetId)`.

### Target types

| targetType | sourceDomain | События (примеры) | options (jsonb) |
|------------|--------------|-------------------|-----------------|
| `AUCTION_CATEGORY` | auction | `auction.created` в категории | `{ notifyOnNewLot: true }` |
| `AUCTION` | auction | `auction.bid_placed`, `auction.completed` | `{ notifyOnNewBid: true, notifyOnEnd: true }` |
| `FORUM_CATEGORY` | forum | новые topic в категории | `{ notifyOnNewTopic: true }` |
| `FORUM_TOPIC` | forum | `forum.comment_created` | `{ notifyOnReply: true, notifyOnReaction: false }` |
| `TAG` | platform | контент с тегом (cross-domain fan-out) | `{ domains: ['forum','auction'] }` |
| `MARKETPLACE_CATEGORY` | marketplace | новые услуги | draft |
| `DIGEST_GLOBAL` | platform | сводка | `{ frequency: 'DAILY' }` |

### `DeliveryPreference` (`subscriptions.delivery_preference`)

| Поле | Тип | Описание |
|------|-----|----------|
| `userId` | UUID PK | — |
| `emailDigestEnabled` | boolean | Pro via plan-config |
| `pushEnabled` | boolean | — |
| `digestFrequency` | enum | `DAILY` \| `WEEKLY` |
| `quietHours` | jsonb nullable | `{ start, end, tz }` |

## 🔌 API

### Public (BFF `/api/v1/subscriptions/*`)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/subscriptions` | Список (`?sourceDomain=`) |
| POST | `/subscriptions` | Создать (check limits) |
| DELETE | `/subscriptions/{id}` | Отписаться |
| GET | `/subscriptions/delivery` | Delivery preferences (defaults if unset) |
| PATCH | `/subscriptions/delivery` | Update delivery (`emailDigestEnabled` → plan-config feature) |

### `POST /api/v1/subscriptions`

```json
{
  "sourceDomain": "forum",
  "targetType": "FORUM_TOPIC",
  "targetId": "topic-uuid",
  "options": { "notifyOnReply": true }
}
```

**Pre-check:** `plan-config` → `subscriptions.*` limits.

### Internal

| Method | Path | Описание |
|--------|------|----------|
| GET | `/internal/v1/subscriptions` | List by user |
| GET | `/internal/v1/subscriptions/count` | Count + limitKey |
| POST | `/internal/v1/subscriptions` | Create |
| DELETE | `/internal/v1/subscriptions/{id}` | Delete |
| GET/PATCH | `/internal/v1/subscriptions/delivery` | Delivery preferences |
| POST | `/internal/v1/subscriptions/match` | `{ eventType, payload }` → `{ userIds }` |
| POST | `/internal/v1/subscriptions/digest/run` | External CRON: due users (notifications stub) |
| GET | `/health`, `/health/ready` | — |

> **Fan-out contract:** producer event → subscriptions `match` → HTTP trigger `notifications` (RMQ consumer later).
> **Digest CRON:** external scheduler → `digest/run` (как deal-feedback `reminders/run`); пока `triggered: 0`.

### Match mapping

| eventType | targetType | payload field |
|-----------|------------|---------------|
| `auction.created` | `AUCTION_CATEGORY` | `categoryId` |
| `auction.bid_placed` / `auction.completed` | `AUCTION` | `auctionId` |
| `forum.topic_created` | `FORUM_CATEGORY` | `categoryId` |
| `forum.comment_created` | `FORUM_TOPIC` | `topicId` |
| `tag.content_tagged` | `TAG` | `tagId` |

## 💳 Переменные plan-config

Ключи — **[PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md)** (не flat alias из старых черновиков):

| Ключ | Free | Basic | Pro | Описание |
|------|------|-------|-----|----------|
| `subscriptions.member.auction.categoryMax` | 3 | 10 | ∞ | Категории аукциона |
| `subscriptions.member.auction.lotMax` | 5 | 20 | ∞ | Конкретные лоты |
| `subscriptions.member.forum.categoryMax` | 5 | 15 | ∞ | Категории форума |
| `subscriptions.member.forum.topicMax` | 10 | 50 | ∞ | Темы |
| `subscriptions.member.tag.max` | 3 | 10 | ∞ | Подписки на теги |
| `subscriptions.member.notify.emailDigestEnabled` | feature | false | false | true |

> Legacy keys `auction_subscriptions.*` → migrate to `subscriptions.*` ([ADR-006](../../03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md)).

## 📨 События

| Direction | Event | Действие |
|-----------|-------|----------|
| consume | `auction.created` | Match AUCTION_CATEGORY |
| consume | `auction.bid_placed` | Match AUCTION |
| consume | `forum.topic_created` | Match FORUM_CATEGORY |
| consume | `forum.comment_created` | Match FORUM_TOPIC |
| consume | `tag.content_tagged` | Match TAG (produce from forum/auction) |
| — | CRON digest | `subscriptions.digest_due` → notifications |

## 🔗 Взаимодействие

| Сервис | Протокол |
|--------|----------|
| plan-config | limits |
| auction, forum, marketplace | RMQ events |
| notifications | HTTP trigger, digest templates |
| BFF | public CRUD |

## 🔒 Безопасность

- CRUD — только `userId === jwt.sub`
- Internal match — service token only

## 📎 Связанные разделы

- [notifications](../notifications/README.md)
- [forum/tags.md](../forum/tags.md)
- [PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md)

---

**Автор:** команда разработки · **Версия:** 0.3-spec

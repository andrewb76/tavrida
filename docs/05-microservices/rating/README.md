# ⭐ Сервис: rating

> **Статус:** spec ready · **Версия:** 0.2 · **Schema:** `rating`

## 🎯 Назначение

**Рейтинг и карма** пользователей Tavrida Lot — агрегаты, формула голоса, бонусы, штрафы и баны.

- Source of truth для `totalRating`, `verifiedSales`, `pendingSales`
- Формула с учётом авторитета голосующего и контекста (auction / forum / marketplace)
- Штрафы за неоценённые сделки; бан → блокировка в auction/forum
- Параметры формул — из `settings`; лимиты pending — из financial-policy

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **totalRating** | Средняя оценка по верифицированным сделкам |
| **verifiedSales** | Сделки с завершённым feedback |
| **pendingSales** | Завершённые сделки без отзыва |
| **feedbackCoverage** | `verifiedSales / (verifiedSales + pendingSales)` |
| **Vote value** | Вес голоса при расчёте (формула ниже) |

## 🧮 Формула голоса

```ts
function calculateVoteValue(voterId: string, context: 'auction' | 'forum' | 'marketplace') {
  const s = getSettings('rating')
  const voter = getUserRating(voterId)
  const baseAuthority = Math.log10(1 + voter.verifiedSales)
  const authorityWeight = Math.pow(baseAuthority, s.authorityExponent)
  const contextWeight = s.contextWeights[context] ?? 1.0
  return s.baseValue * authorityWeight * contextWeight
}
```

## 🗄️ Сущности

### `UserRating` (`rating.user_rating`)

| Поле | Тип | Описание |
|------|-----|----------|
| `userId` | UUID PK | — |
| `totalRating` | decimal | Агрегат |
| `karma` | decimal | Форумные реакции (отдельный счётчик) |
| `verifiedSales` | int | — |
| `pendingSales` | int | — |
| `isLimited` | boolean | Ограничение участия |
| `banUntil` | timestamptz nullable | Активный бан |
| `lastUpdated` | timestamptz | — |

### `VoteLog` (`rating.vote_log`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `voterId`, `targetUserId` | UUID | — |
| `context` | enum | `auction` \| `forum` \| `marketplace` |
| `referenceId` | UUID | feedbackId / reactionId |
| `voteValue` | decimal | Рассчитанный вес |
| `createdAt` | timestamptz | — |

## 🔌 API

### Public (BFF `/api/v1/rating/*`)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/rating/{userId}` | Публичный рейтинг + coverage |

```json
{
  "userId": "uuid",
  "totalRating": 4.5,
  "karma": 12.3,
  "verifiedSales": 12,
  "pendingSales": 2,
  "feedbackCoverage": 0.86,
  "isLimited": true,
  "limitReason": "MAX_PENDING_RATINGS"
}
```

### Internal (`/internal/v1/`)

| Method | Path | Caller | Описание |
|--------|------|--------|----------|
| POST | `/rating/bonuses/apply` | feedback | EARLY / PHOTO / BOTH |
| POST | `/rating/check-ban` | auction, forum, BFF | `{ banned, until? }` |
| POST | `/rating/votes/apply` | feedback, forum | Применить голос после submit |
| POST | `/rating/penalties/evaluate` | CRON | Пересчёт штрафов |
| GET | `/health`, `/health/ready` | orchestrator | — |

### `POST /internal/v1/rating/bonuses/apply`

```json
{
  "userId": "uuid",
  "type": "EARLY",
  "referenceId": "feedback-uuid",
  "context": "auction"
}
```

### `POST /internal/v1/rating/check-ban`

```json
{ "userId": "uuid" }
```

→ `{ "banned": false }` или `{ "banned": true, "until": "2026-07-15T00:00:00Z" }`

## ⚙️ Переменные settings

| Ключ | Default | Описание |
|------|---------|----------|
| `rating.baseValue` | 1 | Базовое значение голоса |
| `rating.authorityExponent` | 0.2 | Степень авторитета |
| `rating.contextWeights` | auction 1.0, forum 1.2, marketplace 0.9 | Веса контекста |
| `rating.bonuses.earlyHours` | 24 | Окно быстрого отзыва |
| `rating.bonuses.earlyBonus` | 0.5 | — |
| `rating.bonuses.photoBonus` | 1.0 | — |
| `rating.bonuses.bothBonus` | 2.0 | Обе стороны оценили |
| `rating.penalties.penaltyDecayFactor` | 0.9 | Множитель при N pending |
| `rating.penalties.banThreshold` | 10 | Pending → бан |
| `rating.penalties.banDurationDays` | 7 | Длительность бана |

> [PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md)

## 💳 Переменные financial-policy

| Ключ | Free | Basic | Pro | Описание |
|------|------|-------|-----|----------|
| `rating.maxPendingBeforePenalty` | 3 | 5 | 10 | Pending до штрафа |
| `rating.maxActiveAuctionsWhenLimited` | 2 | 3 | 5 | Лимит аукционов при penalty |

## 📨 События

| Direction | Event | Когда |
|-----------|-------|-------|
| consume | `auction.completed` | `pendingSales++` seller/buyer |
| consume | `feedback.submitted` | Recalc rating, `pendingSales--` |
| consume | `marketplace.order_completed` | pending для provider/customer |
| produce | `rating.updated` | Изменение агрегата |
| produce | `rating.penalty_applied` | Штраф за pending |
| produce | `rating.user_banned` | Бан → auction/forum block |

## 🔗 Взаимодействие

| Сервис | Протокол |
|--------|----------|
| settings | HTTP GET settings/rating |
| financial-policy | limits для pending |
| feedback | bonuses/apply, votes |
| forum | karma от реакций |
| user-profile | consume `rating.updated` → cache |
| auction, forum | check-ban перед mutate |

## 🔒 Безопасность

- Public GET — любой authenticated/guest (публичные поля)
- Internal mutate — service token only
- Ban enforcement — downstream вызывает check-ban; rating не блокирует HTTP напрямую

## ⚙️ Окружение

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `DATABASE_URL` | да | schema `rating` |
| `RABBITMQ_URL` | да | Events |
| `SETTINGS_URL` | да | Формулы |
| `FINANCIAL_POLICY_URL` | да | Лимиты pending |
| `PORT` | нет | HTTP |

> [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md)

## 📎 Связанные разделы

- [feedback](../feedback/README.md)
- [settings](../settings/README.md)
- [Event catalog](../../03-architecture/event-catalog.md)
- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

# ⭐ Сервис: rating

> **Статус:** spec ready · **Версия:** 0.2 · **Schema:** `rating`

## 🎯 Назначение

**Рейтинг, карма и реферальный вклад** пользователей Tavrida Lot — агрегаты, формула голоса, бонусы, штрафы, баны и **дерево инвайтов** (N уровней).

- Source of truth для `totalRating`, `karma`, `referralKarma`, `referralRating`, `verifiedSales`, `pendingSales`
- Формула с учётом авторитета голосующего и контекста (auction / forum / marketplace)
- **Referral tree:** effective karma/rating inviter от invitees до `rating.referral.maxDepth`
- Штрафы за неоценённые сделки; бан → блокировка в auction/forum
- Параметры формул — из `scalar-config`; лимиты pending и инвайтов — из plan-config

> **Канонический продуктовый справочник:** [karma-and-rating.md](../../01-goal/karma-and-rating.md)

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **totalRating** | Средняя оценка по верифицированным сделкам |
| **karma** | Социальный счёт (форумные реакции) |
| **referralKarma** | Добавка от дерева приглашённых |
| **referralRating** | Добавка к effective rating от дерева |
| **effectiveKarma** | `karma + referralKarma` |
| **effectiveRating** | `clamp(totalRating + referralRating, …)` |

| **verifiedSales** | Сделки с завершённым feedback |
| **pendingSales** | Завершённые сделки без отзыва |
| **feedbackCoverage** | `verifiedSales / (verifiedSales + pendingSales)` |
| **Vote value** | Вес голоса при расчёте (формула ниже) |

## 🌳 Реферальное дерево

При `club.referralInfluenceEnabled` (plan-config) и redeem инвайта (`user-profile.invitation`):

```
referralKarma(I) = Σ_{d=1..N} α_d × Σ_{u ∈ L(d)} K(u)
referralRating(I) = Σ_{d=1..N} β_d × Σ_{u ∈ L(d)} (R(u) - R_neutral)
```

Пересчёт при `rating.updated` для любого потомка; коэффициенты — settings. Подробно: [karma-and-rating.md §6](../../01-goal/karma-and-rating.md#-6-реферальное-дерево-инвайты).

### Поля `UserRating` (referral)

| Поле | Тип | Описание |
|------|-----|----------|
| `referralKarma` | decimal | Агрегат дерева (карма) |
| `referralRating` | decimal | Агрегат дерева (рейтинг) |
| `referralLastComputedAt` | timestamptz | Маркер reconcile |

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
| `karma` | decimal | Форумные реакции |
| `referralKarma` | decimal | От invite tree |
| `referralRating` | decimal | От invite tree |
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
| GET | `/profile/{userId}/rating/log?metric=karma\|rating` | Лог изменений (BFF → user-profile; click popup) |

```json
{
  "userId": "uuid",
  "totalRating": 4.5,
  "karma": 12.3,
  "referralKarma": 1.5,
  "referralRating": 0.08,
  "effectiveKarma": 13.8,
  "effectiveRating": 4.58,
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
| POST | `/rating/bonuses/apply` | deal-feedback | EARLY / PHOTO / BOTH |
| POST | `/rating/check-ban` | auction, forum, BFF | `{ banned, until? }` |
| POST | `/rating/votes/apply` | feedback, forum | Применить голос после submit |
| POST | `/rating/referral/recompute` | user-profile, CRON | Пересчёт referral для inviter chain |
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

## ⚙️ Переменные scalar-config

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
| `rating.referral.maxDepth` | 2 | N уровней дерева |
| `rating.referral.karmaCoefficients` | [0.15, 0.05] | α по уровням |
| `rating.referral.ratingCoefficients` | [0.05, 0.02] | β по уровням |
| `rating.referral.neutralRating` | 3.0 | R_neutral |

> [PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md) · [karma-and-rating.md](../../01-goal/karma-and-rating.md)

## 💳 Переменные plan-config

| Ключ | Free | Basic | Pro | Описание |
|------|------|-------|-----|----------|
| `rating.maxPendingBeforePenalty` | 3 | 5 | 10 | Pending до штрафа |
| `rating.maxActiveAuctionsWhenLimited` | 2 | 3 | 5 | Лимит аукционов при penalty |

| `club.invitesPerMonth` | 1 | 3 | 10 | Инвайт-кодов / месяц |
| `club.referralInfluenceEnabled` | true | true | true | Referral tree в effective metrics |

## 📨 События

| Direction | Event | Когда |
|-----------|-------|-------|
| consume | `auction.completed` | `pendingSales++` seller/buyer |
| consume | `deal_feedback.submitted` | Recalc rating, `pendingSales--` |
| consume | `marketplace.order_completed` | pending для provider/customer |
| consume | `invitation.redeemed` | Referral recompute inviter chain |
| produce | `rating.updated` | Изменение агрегата |
| produce | `rating.penalty_applied` | Штраф за pending |
| produce | `rating.user_banned` | Бан → auction/forum block |

## 🔗 Взаимодействие

| Сервис | Протокол |
|--------|----------|
| scalar-config | HTTP GET settings/rating |
| plan-config | limits для pending |
| deal-feedback | bonuses/apply, votes |
| forum | karma от реакций |
| user-profile | invitation edges, consume `rating.updated` → cache |
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
| `SCALAR_CONFIG_URL` | да | Формулы |
| `PLAN_CONFIG_URL` | да | Лимиты pending |
| `PORT` | нет | HTTP |

> [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md)

## 📎 Связанные разделы

- [karma-and-rating.md](../../01-goal/karma-and-rating.md)
- [club-access.md](../../01-goal/club-access.md)
- [deal-feedback](../deal_feedback/README.md)
- [scalar-config](../scalar-config/README.md)
- [Event catalog](../../03-architecture/event-catalog.md)
- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

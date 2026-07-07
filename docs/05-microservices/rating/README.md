# ⭐ Сервис: rating

> **Статус:** draft · **Версия:** 0.1

## 🎯 Назначение

Сервис управления **рейтингами и кармой пользователей** на платформе **Tavrida Lot**.

- Хранит агрегированные данные: `totalRating`, `verifiedSales`, `pendingSales`, `feedbackCoverage`
- Применяет **гибкую формулу голосования** с учётом авторитета и контекста
- Включает **стимулирующие бонусы** (за быстрый отзыв, фото) и **штрафы** (за игнорирование сделок)
- Все параметры настраиваются через `settings.rating.*`

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Рейтинг (`totalRating`)** | Средняя оценка по оценённым сделкам |
| **Верифицированные сделки (`verifiedSales`)** | Сделки с оценками |
| **Ожидающие оценки (`pendingSales`)** | Завершённые аукционы без отзывов |
| **Покрытие отзывами (`feedbackCoverage`)** | `verifiedSales / (verifiedSales + pendingSales)` |

## 🧮 Формула голоса

Пример функции на TypeScript:

```ts
function calculateVoteValue(voterId, context) {
  const settings = getSettings()
  const voter = getUserRating(voterId)
  const baseAuthority = Math.log10(1 + voter.verifiedSales)
  const authorityWeight = Math.pow(baseAuthority, settings.authorityExponent)
  const contextWeight = settings.contextWeights[context] || 1.0
  return settings.baseValue * authorityWeight * contextWeight
}
```

## 🎁 Бонусы и штрафы

| Сценарий | Бонус/Штраф |
|---------|-------------|
| Отзыв в течение 24 часов | `+0.5` к рейтингу |
| Отзыв с фото/видео | `+1.0` к рейтингу |
| Отзыв за обе стороны | `+2.0` к рейтингу |
| 3+ неоценённых за 30 дней | `rating *= 0.9` |
| 5+ неоценённых за 60 дней | `rating *= 0.8`, `maxPendingRatings=2` |
| 10+ неоценённых за 90 дней | Бан на 7 дней |

## 🗄️ Сущности (TypeORM)

### `UserRating`

```ts
@Entity()
export class UserRating {
  @PrimaryColumn('uuid')
  userId: string

  @Column('decimal')
  totalRating: number

  @Column('int', { default: 0 })
  verifiedSales: number

  @Column('int', { default: 0 })
  pendingSales: number

  @Column('datetime')
  lastUpdated: Date
}
```

## 🔌 API

### `GET /api/v1/rating?userId=xxx`

```json
{
  "userId": "xxx",
  "totalRating": 4.5,
  "verifiedSales": 12,
  "pendingSales": 2,
  "feedbackCoverage": 0.86,
  "isLimited": true,
  "limitReason": "MAX_PENDING_RATINGS",
  "nextAction": "Оцените 2 аукциона: #789, #810"
}
```

> 💡 Полный реестр: [PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md). Ниже — ключи домена rating.

## ⚙️ Переменные settings

| Ключ | Тип | Default | Описание |
|------|-----|---------|----------|
| `rating.baseValue` | number | 1 | Базовое значение голоса |
| `rating.authorityExponent` | number | 0.2 | Степень авторитета |
| `rating.contextWeights` | object | см. ниже | Веса по контексту |
| `rating.bonuses.earlyHours` | number | 24 | Окно «быстрого» отзыва |
| `rating.bonuses.earlyBonus` | number | 0.5 | Бонус за быстрый отзыв |
| `rating.bonuses.photoBonus` | number | 1.0 | Бонус за фото |
| `rating.bonuses.bothBonus` | number | 2.0 | Бонус за отзыв обеих сторон |
| `rating.penalties.penaltyDecayFactor` | number | 0.9 | Множитель штрафа |
| `rating.penalties.banThreshold` | number | 10 | Порог бана (pending) |
| `rating.penalties.banDurationDays` | number | 7 | Длительность бана |

Default `rating.contextWeights`:

```json
{ "auction": 1.0, "forum": 1.2, "marketplace": 0.9 }
```

> Источник истины — сервис `settings`. Не дублировать значения в коде.

## 💳 Переменные financial-policy

| Ключ | Тип | Описание |
|------|-----|----------|
| `rating.maxPendingBeforePenalty` | limit | Макс. pending до штрафа (per plan) |

## 🔌 API (продолжение)

### `POST /internal/v1/rating/bonuses/apply`

```json
{
  "userId": "uuid",
  "type": "EARLY",
  "auctionId": "uuid"
}
```

Вызывается сервисом `feedback` после submit.

### `POST /internal/v1/rating/check-ban`

```json
{ "userId": "uuid" }
```

Ответ: `{ "banned": false }` или `{ "banned": true, "until": "ISO8601" }`

Вызывается `auction`, `forum` перед mutating operations.

## 📨 События

| Direction | Event |
|-----------|-------|
| consume | `auction.completed`, `feedback.submitted` |
| produce | `rating.penalty_applied`, `rating.user_banned` |

## 🔗 Взаимодействие

| Сервис | Взаимодействие |
|--------|----------------|
| `settings` | `GET /settings/rating` — формулы и бонусы |
| `financial-policy` | `POST /limits/check` — лимиты pending |
| `feedback` | `POST /rating/bonuses/apply` (internal) |
| `auction`, `forum` | `POST /rating/check-ban` (internal) |
| `user-profile` | consume events → sync cache |

## 📎 Связанные разделы

- [settings](../settings/README.md)
- [feedback](../feedback/README.md)
- [ADR-003](../../03-architecture/adr/003-settings-vs-financial-policy.md)
- [Event catalog](../../03-architecture/event-catalog.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft

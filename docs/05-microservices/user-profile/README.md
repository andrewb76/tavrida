# 👤 Сервис: user-profile

> **Статус:** spec ready · **Версия:** 0.2 · **Schema:** `user_profile`

## 🎯 Назначение

**Профиль пользователя**, аватар, bio, **инвайты клуба** и **приватные заметки** между пользователями.

- Denormalized cache рейтинга из `rating` (sync по events)
- **Invitation graph:** `inviterId` при регистрации по invite (реферал, не gate доступа)
- Публичный профиль для auction / forum / marketplace UI (member-only на BFF)
- `ProfileNote` — видны только автору и владельцу профиля

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **UserProfile** | Bio, avatar, cached rating fields |
| **ProfileNote** | Приватная заметка `authorId` → `ownerId` |
| **InviteCode** | Код приглашения, выданный member |
| **Invitation** | Связь invitee → inviter после claim |
| **Denormalized cache** | `rating`, `verifiedSales`, `pendingSales` — SoT: rating |

## 🗄️ Сущности

### `UserProfile` (`user_profile.user_profile`)

| Поле | Тип | Описание |
|------|-----|----------|
| `userId` | varchar(128) PK | Logto `sub` (opaque id, not UUID) |
| `inviterId` | varchar(128) nullable | Кто пригласил (после claim по invite) |
| `invitationAcceptedAt` | timestamptz nullable | Когда зафиксирован реферал (не gate UI) |
| `displayName` | varchar nullable | Имя из Logto (`name` / `username`) |
| `email` | varchar nullable | `primaryEmail` (sync webhook) |
| `username` | varchar nullable | Club handle — см. [requirements/username.md](./requirements/username.md) |
| `avatarUrl` | varchar nullable | Logto `avatar` (URL) |
| `primaryPhone` | varchar nullable | Logto phone |
| `isSuspended` | boolean | Logto suspension (зеркало webhook) |
| `isHardLocked` | boolean | Admin hard lock — [hard-lock.md](./hard-lock.md) |
| `hardLockedAt` / `hardLockedBy` | timestamptz / varchar | Когда / кто включил hard lock |
| `deletedAt` | timestamptz nullable | Soft delete (`User.Deleted`) |
| `logtoSyncedAt` | timestamptz nullable | Последний webhook/backfill |
| `bio` | text nullable | — (ручной override, позже) |
| `rating` | decimal | Cache from rating |
| `verifiedSales`, `pendingSales` | int | Cache |
| `lastSyncedAt` | timestamptz | Event sync marker |
| `createdAt`, `updatedAt` | timestamptz | — |

### `ProfileNote` (`user_profile.profile_note`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `ownerId` | UUID | Профиль, о котором заметка |
| `authorId` | UUID | Автор заметки |
| `text` | text | max 2000 chars |
| `createdAt` | timestamptz | — |

Unique: one note per `(ownerId, authorId)` — upsert on POST.

### `InviteCode` (`user_profile.invite_code`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `code` | varchar unique | Публичный код |
| `issuerId` | varchar(128) | Member (Logto `sub`), создавший код |
| `maxUses` | int | 1 для SINGLE_USE |
| `usesCount` | int | — |
| `expiresAt` | timestamptz | `club.invite.validityDays` |
| `createdAt` | timestamptz | — |

### `Invitation` (`user_profile.invitation`)

| Поле | Тип | Описание |
|------|-----|----------|
| `inviteeId` | varchar(128) PK | Новый member (Logto `sub`) |
| `inviterId` | varchar(128) | Прямой пригласивший |
| `inviteCodeId` | UUID FK | Использованный код |
| `acceptedAt` | timestamptz | — |

## 🔌 API

### Public (BFF `/api/v1/profile/*`)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/profile/{userId}` | Публичный профиль |
| GET | `/profile/{userId}/rating/log` | История rating/karma |
| GET | `/profile/notes?ownerId=` | Заметки (author or owner only) |
| POST | `/profile/notes` | Создать/обновить заметку |
| DELETE | `/profile/notes/{id}` | Удалить (author only) |

### Invites (BFF public — см. [bff/invites-api.md](../bff/invites-api.md))

| Method | BFF path | Описание |
|--------|----------|----------|
| GET | `/invites` | Мои коды (proxy list) |
| POST | `/invites` | Создать (internal persist) |
| GET | `/invites/resolve` | Lookup code → token |
| POST | `/invites/claim` | Записать invitation |

### Internal

| Method | Path | Описание |
|--------|------|----------|
| POST | `/internal/v1/invites` | Создать invite_code + logtoToken ref |
| GET | `/internal/v1/invites` | Список по issuerId |
| GET | `/internal/v1/invites/resolve` | Lookup |
| POST | `/internal/v1/invites/claim` | invitation + inviterId |
| GET | `/internal/v1/users` | Список профилей (admin BFF) |
| POST | `/internal/v1/users/sync-logto` | Upsert из Logto webhook/backfill |
| POST | `/internal/v1/users/ensure` | Пустой профиль (lazy) |
| POST | `/internal/v1/users/lookup` | Batch lookup профилей |
| POST | `/internal/v1/users/admin-card-stats` | Batch: rating + invites + referral L1/L2 (admin cards) |
| GET | `/internal/v1/users/{userId}` | Профиль для BFF |
| GET | `/internal/v1/users/{userId}/public` | Публичная проекция |
| POST | `/internal/v1/users/{userId}/mark-deleted` | Soft delete |
| GET/POST/DELETE | `/internal/v1/profile-notes/*` | Приватные заметки |
| GET | `/health`, `/health/ready` | — |

## ⚙️ Переменные scalar-config

Не владеет domain settings (не регистрирует ключи в `services/scalar-config`).  
Потребляет `club.*` через BFF и `club.member.invite.monthlyMax` через plan-config.

## 💳 Переменные plan-config

**Владелец register:** `user-profile` при старте.

| Ключ | Описание | Дефолты (planValues) |
|------|----------|----------------------|
| `club.member.invite.monthlyMax` | Лимит новых кодов / месяц | 1 / 3 / 10 |
Целевой файл seed: `services/user-profile/src/config/plan-variables.ts` (см. [ADR-016](../../03-architecture/adr/016-financial-policy-parameter-registration.md)).

> [club-access.md](../../01-goal/club-access.md) · [PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md)

## 📨 События

| Direction | Event | Действие |
|-----------|-------|----------|
| produce | `invitation.redeemed` | Transactional outbox при первом claim; consumers rating / referral-rewards — planned |
| consume | `rating.updated` | Update cached rating fields |
| planned consume | `deal_feedback.submitted` | Сейчас deal-feedback вызывает sync adjustment |
| consume | `subscription.activated` | Invalidate BFF cache (optional) |

## 🔗 Взаимодействие

| Сервис | Протокол |
|--------|----------|
| rating | events → cache; referral recompute on claim |
| referral-rewards | ancestor-chain target | пока не реализовано |
| BFF | `/profile/{userId}` + notes/rating log |
| MinIO | avatars bucket |
| Logto | webhooks → BFF → `sync-logto`; см. [logto-webhooks.md](../../14-frontend/logto-webhooks.md) |

## 🔒 Безопасность

- Изменение профиля — target; runtime BFF сейчас предоставляет read API
- Notes — **never** exposed in public profile JSON
- GET notes — Keto: `authorId === sub` OR `ownerId === sub`
- Avatar upload — presigned URL, max size TBD

## ⚙️ Окружение

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `DATABASE_URL` | да | schema `user_profile` |
| `RABBITMQ_URL` | нет* | Relay `invitation.redeemed`; без URL событие остаётся pending в outbox |
| `MINIO_*` | да | bucket `avatars` |
| `PORT` | нет | HTTP |

> [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md) · [10-data](../../10-data/README.md)

## 📎 Связанные разделы

- [requirements/username.md](./requirements/username.md) — unique handle для @mention (chat)
- [club-access.md](../../01-goal/club-access.md)
- [bff/invites-api.md](../bff/invites-api.md)
- [karma-and-rating.md](../../01-goal/karma-and-rating.md)
- [rating](../rating/README.md)
- [BFF aggregation](../bff/README.md)
- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

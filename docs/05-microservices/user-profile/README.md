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
| `displayName` | varchar nullable | Override (optional) |
| `bio` | text nullable | — |
| `avatarUrl` | varchar nullable | MinIO `avatars` |
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
| GET | `/profile/me` | Свой профиль (+ subscription via BFF agg) |
| GET | `/profile/{userId}` | Публичный профиль |
| PATCH | `/profile/me` | bio, displayName, avatar upload URL |
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
| GET | `/internal/v1/users/{userId}/ancestor-chain` | Цепочка inviter → … (для referral-rewards, rating) |
| POST | `/internal/v1/profile/sync-rating` | Admin/reconcile |
| POST | `/internal/v1/profile/ensure` | Create empty profile on first login |
| GET | `/health`, `/health/ready` | — |

## ⚙️ Переменные settings

Не владеет domain settings (не регистрирует ключи в `services/settings`).  
Потребляет `club.*` через BFF и `club.invitesPerMonth` через financial-policy.

## 💳 Переменные financial-policy

**Владелец register:** `user-profile` при старте.

| Ключ | Описание | Дефолты (planValues) |
|------|----------|----------------------|
| `club.invitesPerMonth` | Лимит новых кодов | 1 / 3 / −1 |

Целевой файл seed: `services/user-profile/src/config/financial-parameters.ts` (см. [ADR-016](../../03-architecture/adr/016-financial-policy-parameter-registration.md)).

> [club-access.md](../../01-goal/club-access.md) · [PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md)

## 📨 События

| Direction | Event | Действие |
|-----------|-------|----------|
| produce | `invitation.redeemed` | `{ inviteeId, inviterId, inviteCodeId }` → rating, **referral-rewards** |
| consume | `rating.updated` | Update cached rating fields |
| consume | `feedback.submitted` | Optional refresh |
| consume | `subscription.activated` | Invalidate BFF cache (optional) |

## 🔗 Взаимодействие

| Сервис | Протокол |
|--------|----------|
| rating | events → cache; referral recompute on claim |
| referral-rewards | ancestor-chain HTTP | referral-rewards → user-profile |
| BFF | aggregation `/profile/me` |
| MinIO | avatars bucket |
| Logto | displayName fallback from JWT claims |

## 🔒 Безопасность

- PATCH `/profile/me` — только owner
- Notes — **never** exposed in public profile JSON
- GET notes — Keto: `authorId === sub` OR `ownerId === sub`
- Avatar upload — presigned URL, max size TBD

## ⚙️ Окружение

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `DATABASE_URL` | да | schema `user_profile` |
| `RABBITMQ_URL` | да | Consume rating events |
| `MINIO_*` | да | bucket `avatars` |
| `PORT` | нет | HTTP |

> [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md) · [10-data](../../10-data/README.md)

## 📎 Связанные разделы

- [club-access.md](../../01-goal/club-access.md)
- [bff/invites-api.md](../bff/invites-api.md)
- [karma-and-rating.md](../../01-goal/karma-and-rating.md)
- [rating](../rating/README.md)
- [BFF aggregation](../bff/README.md)
- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

# 👤 Сервис: user-profile

> **Статус:** spec ready · **Версия:** 0.2 · **Schema:** `user_profile`

## 🎯 Назначение

**Профиль пользователя**, аватар, bio и **приватные заметки** между пользователями.

- Denormalized cache рейтинга из `rating` (sync по events)
- Публичный профиль для auction / forum / marketplace UI
- `ProfileNote` — видны только автору и владельцу профиля

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **UserProfile** | Bio, avatar, cached rating fields |
| **ProfileNote** | Приватная заметка `authorId` → `ownerId` |
| **Denormalized cache** | `rating`, `verifiedSales`, `pendingSales` — SoT: rating |

## 🗄️ Сущности

### `UserProfile` (`user_profile.user_profile`)

| Поле | Тип | Описание |
|------|-----|----------|
| `userId` | UUID PK | Logto sub |
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

### `GET /api/v1/profile/{userId}`

```json
{
  "userId": "uuid",
  "displayName": "coin_collector",
  "bio": "Продавец редких монет",
  "avatarUrl": "https://…",
  "rating": 4.8,
  "verifiedSales": 20,
  "pendingSales": 1
}
```

### Internal

| Method | Path | Описание |
|--------|------|----------|
| POST | `/internal/v1/profile/sync-rating` | Admin/reconcile |
| POST | `/internal/v1/profile/ensure` | Create empty profile on first login |
| GET | `/health`, `/health/ready` | — |

## ⚙️ Переменные settings

Не владеет domain settings.

## 💳 Переменные financial-policy

Не применимо.

## 📨 События

| Direction | Event | Действие |
|-----------|-------|----------|
| consume | `rating.updated` | Update cached rating fields |
| consume | `feedback.submitted` | Optional refresh |
| consume | `subscription.activated` | Invalidate BFF cache (optional) |

## 🔗 Взаимодействие

| Сервис | Протокол |
|--------|----------|
| rating | events → cache |
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

- [rating](../rating/README.md)
- [BFF aggregation](../bff/README.md)
- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

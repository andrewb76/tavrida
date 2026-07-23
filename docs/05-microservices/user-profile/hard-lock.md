# Жёсткая блокировка пользователя (hard lock)

> **Статус:** implemented · **Дата:** 2026-07-23  
> **Сервис:** [user-profile/README.md](./README.md) · enforce: BFF `JwtAuthGuard`

## Зачем

Отдельно от:

| Механизм | Где | Эффект |
|----------|-----|--------|
| Рейтинговый бан (`banUntil`) | rating `check-ban` | Блокирует мутации auction/forum (автоматический / временный) |
| Logto `isSuspended` | зеркало webhook | Состояние IdP; **не** режет BFF само по себе |
| **Hard lock** | `user_profile.is_hard_locked` | Admin вкл/выкл → **любой** BFF API с JWT → `403 hard_locked` |

## Правило

- `isHardLocked = true` → после успешной проверки JWT BFF отвечает `403` `{ type: "hard_locked" }`.
- WebSocket `/ws/v1` с токеном заблокированного — закрытие `4403`.
- Logto-сессия может оставаться валидной; вход в SPA возможен, но API не работает.
- Нельзя заблокировать **себя** и другого **platform admin**.
- Logto sync **не** перезаписывает hard lock.

## Хранение

| Column | Type |
|--------|------|
| `is_hard_locked` | boolean NOT NULL DEFAULT false |
| `hard_locked_at` | timestamptz nullable |
| `hard_locked_by` | varchar(128) nullable (admin `sub`) |

## API

| Method | Path | Кто | Описание |
|--------|------|-----|----------|
| PATCH | `/api/v1/admin/users/{userId}/hard-lock` | admin | `{ "locked": boolean }` |
| GET | list admin users | admin | поле `isHardLocked` |

## UI

`/admin/users` — компактная карточка + меню **«Действия»** → «Жёсткая блокировка» / «Снять hard-lock» (не путать с «приостановлен Logto»).

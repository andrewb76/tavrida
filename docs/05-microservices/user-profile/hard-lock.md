# 🔒 Жёсткая блокировка пользователя (hard lock)

> **Статус:** stable (implemented) · **Дата:** 2026-07-24  
> **Сервис:** [user-profile/README.md](./README.md) · enforce: BFF `JwtAuthGuard` · SPA: `/account-locked`

## Зачем

Отдельно от:

| Механизм | Где | Статус | Эффект |
|----------|-----|--------|--------|
| Рейтинговый бан (`banUntil`) | целевой `services/rating` `check-ban` | **docs-only / не enforce** | План: блокировать мутации auction/forum; **сейчас в runtime нет** |
| Logto `isSuspended` | зеркало webhook → `user_profile` | live (зеркало) | Состояние IdP; **не** режет BFF само по себе |
| **Hard lock** | `user_profile.is_hard_locked` | **live** | Admin вкл/выкл → BFF API с JWT актора → `403 hard_locked` |

Админ-карточка показывает `banUntil` / `isLimited` как stub (`null` / `false`) до появления rating-service — см. [admin-users-card.md](../bff/admin-users-card.md).

## Правило

- `isHardLocked = true` у **JWT actor** (`sub` токена) → после verify JWT BFF отвечает `403` `{ type: "hard_locked" }`.
- Проверка выполняется **до** применения `X-Act-As` ([impersonation.md](../../09-security/impersonation.md) · [ADR-018](../../03-architecture/adr/018-admin-impersonation.md)): hard-lock режет **админа/пользователя с токеном**, а не effective target. Admin с валидным токеном **может** `X-Act-As` на hard-locked пользователя (расследование / разблокировка через admin API).
- WebSocket `/ws/v1` с токеном заблокированного актора — закрытие `4403`.
- Logto-сессия может оставаться валидной; вход в SPA ведёт на `/account-locked` (ловушка маршрутов), API актора не работает.
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

### Админка

`/admin/users` — компактная карточка + меню **«Действия»** → «Жёсткая блокировка» / «Снять hard-lock» (не путать с «приостановлен Logto»).

### SPA заблокированного актора

| Элемент | Поведение |
|---------|-----------|
| Маршрут | `/account-locked` (`account-locked`) |
| Когда | JWT-актор с `isHardLocked` (ответ BFF `403` `{ type: "hard_locked" }`, обычно при `/me/roles`) |
| Ловушка | Любой другой URL → редирект на `/account-locked` (кроме `/callback`) |
| Сессия | Logto **не** разлогинивает автоматически; на странице есть «Выйти» |
| Контент | Текст: аккаунт заблокирован, обратитесь к администратору + иллюстрация |
| Снятие | После снятия hard-lock админом — следующий `/me/roles` OK → выход с `/account-locked` в клуб |

> Не путать с рейтинговым баном (`banUntil`) — тот **не** enforce в runtime.

# Admin users card (`/admin/users`)

> **Статус:** implemented · **Дата:** 2026-07-23  
> **UI:** `AdminUsersView` · **API:** BFF `GET /api/v1/admin/users`

## Карточка (компактная)

Шапка: аватар · имя (ссылка `/profile/{userId}`) · бейджи ролей `member` / `expert` / `moderator` / `admin` · статусы hard-lock / Logto suspend / deleted / rating-ban · меню **«Действия»** (⋮).

Сетка метаданных:

| Блок | Источник |
|------|----------|
| Баланс | billing |
| ★ / effective · karma | user-profile `user_rating` (batch `admin-card-stats`) |
| verified/pending sales · coverage | то же |
| План · expiresAt · autoRenew | plan-config subscription |
| Инвайты выдано · квота мес. | invite_code + plan-config `club.member.invite.monthlyMax` |
| L1 / L2 | `user_profile.inviter_id` дерево |
| Пригласил | `inviterId` + lookup имени |
| Access groups | forum memberships |
| created / updated / logtoSyncedAt / deletedAt | user_profile |
| banUntil / isLimited | поля в ответе (`null` / `false` пока rating-service docs-only) |

## Действия (меню)

| Пункт | Endpoint / переход |
|-------|-------------------|
| Пополнить баланс | `POST …/wallet/deposit` (модалка) |
| История кошелька | `/admin/users/:userId/wallet` → `GET …/wallet/transactions` |
| Лог репутации | modal `ProfileReputationLogModal` |
| Публичный профиль | `/profile/:userId` |
| Роли (Keto) | `PATCH …/roles` (модалка) |
| Force sync Logto | `POST …/sync-logto` |
| Hard lock | `PATCH …/hard-lock` |
| Подключиться | ADR-018 impersonation |

## Internal batch

| Method | Path | Сервис |
|--------|------|--------|
| POST | `/internal/v1/users/admin-card-stats` | user-profile |
| POST | `/internal/v1/access-groups/memberships/by-users` | forum |

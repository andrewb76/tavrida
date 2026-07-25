# 👤 Admin users card (`/admin/users`)

> **Статус:** stable (implemented) · **Дата:** 2026-07-23  
> **UI:** `AdminUsersView` · **API:** BFF `GET /api/v1/admin/users`

## Карточка (компактная)

Шапка: аватар · имя (ссылка `/profile/{userId}`) · бейджи ролей `member` / `expert` / `moderator` / `admin` · статусы hard-lock / Logto suspend / deleted · меню **«Действия»** (⋮).

Бейдж **rating-ban** — **placeholder** (показывается только если когда-нибудь придут `banUntil` / `isLimited`; сейчас всегда stub).

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
| banUntil / isLimited | stub (`null` / `false`) до [rating](../rating/README.md) service |

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

## Связано

- [hard-lock.md](../user-profile/hard-lock.md)
- [impersonation.md](../../09-security/impersonation.md) · [ADR-018](../../03-architecture/adr/018-admin-impersonation.md)
- [rating/README.md](../rating/README.md) (docs-only target)

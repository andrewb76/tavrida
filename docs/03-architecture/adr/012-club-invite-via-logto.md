# ADR-012: Клуб — member = Logto, инвайт = регистрация + реферал

> **Статус:** accepted · **Дата:** 2026-07-09 · **Обновлено:** 2026-08-17

## 🎯 Контекст

Двухшаговая модель (Logto + отдельный `POST /invites/redeem` для доступа в клуб) воспринималась как избыточная: пользователь с учёткой в Logto ожидает, что он уже в клубе.

Инвайт по смыслу продукта — **закрытая регистрация** и **построение реферальной сети**, а не второй пропуск после OIDC.

## ✅ Решение

### Одно правило доступа

| Условие | Статус |
|---------|--------|
| JWT Logto нашего tenant (успешный sign-in) | **Member** — полный доступ к SPA |
| Нет JWT | **Visitor** — лендинг, `/about`, `/join` |

Отдельный gate `invitationAcceptedAt` для роутов **не используется**. Поле в `user-profile` остаётся для **реферального учёта** (`inviterId`), не для авторизации UI.

### Инвайт = Logto user + loginHint

1. Member создаёт приглашение (email и/или ссылка).
2. BFF вызывает Logto Management API: `POST /api/users` (создаёт пользователя с unverified email).
3. BFF сохраняет `code` (`TAV-XXXX-XXXX`) → `{ logtoUserId, inviterId, email? }` в `user-profile`.
4. Гость открывает `/join?code=TAV-…`.
5. Фронт резолвит invite → получает `email`, вызывает `signIn({ loginHint: email })`.
6. Logto показывает sign-up flow: **email verification → password → member**.
7. Webhook / callback BFF фиксирует `inviterId` для rating/referral.

> **Почему не one-time token:** OTT автоматически верифицирует email (токен отправлен на этот email), поэтому Logto пропускает шаг email verification. Новый подход через `createUser` + `loginHint` позволяет Logto показать полный flow: email → verify → password.

### Код `TAV-XXXX-XXXX`

Человекочитаемый alias ссылки. Технически — короткий ключ к той же записи invite в `user-profile`. Можно делиться кодом или полной ссылкой.

### Bootstrap (день 0)

- Пользователи, созданные в Logto Console вручную, считаются members при первом входе.
- Первые инвайты выдаёт admin (без лимита) через тот же BFF flow.

## ❌ Отклонено

- **Member = Logto + redeem** — двойной gate (supersedes v0.1 club-access flow).
- **Только org invitations Logto** — избыточно для single-club; invite flow проще.
- **One-time tokens** — автоматически верифицируют email, пропуская sign-up flow (email → verify → password).

## 📎 Последствия

- Фронт: guard `requiresMember` ≡ `isAuthenticated` (Logto).
- BFF: `POST /invites`, `GET /invites/resolve?code=`, Management API M2M (`POST /api/users`).
- Logto Console: disable public registration; M2M app для BFF; sign-up: Email + Password + Verify email.
- DB migration: `logto_token` → `logto_user_id` в `invite_code`.
- Docs: [club-access.md](../../01-goal/club-access.md), [logto-setup.md](../../14-frontend/logto-setup.md).

## 🔗 Связанные ADR

- Supersedes invite-gate части v0.1 club-access (redeem для доступа).

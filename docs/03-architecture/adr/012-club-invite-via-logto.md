# ADR-012: Клуб — member = Logto, инвайт = регистрация + реферал

> **Статус:** accepted · **Дата:** 2026-07-09

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

### Инвайт = magic link (Logto one-time token)

1. Member создаёт приглашение (email и/или ссылка).
2. BFF вызывает Logto Management API: `POST /api/one-time-tokens`.
3. BFF сохраняет `code` (`TAV-XXXX-XXXX`) → `{ token, inviterId, email? }`.
4. Гость открывает `/join?token=…&email=…` или `/join?code=TAV-…`.
5. Фронт вызывает `signIn({ loginHint, extraParams: { one_time_token } })`.
6. Logto регистрирует или логинит (публичный sign-up **выключен** в Console).
7. Webhook / callback BFF фиксирует `inviterId` для rating/referral.

### Код `TAV-XXXX-XXXX`

Человекочитаемый alias ссылки. Технически — короткий ключ к той же записи invite в `user-profile`. Можно делиться кодом или полной ссылкой.

### Bootstrap (день 0)

- Пользователи, созданные в Logto Console вручную, считаются members при первом входе.
- Первые инвайты выдаёт admin (без лимита) через тот же BFF flow.

## ❌ Отклонено

- **Member = Logto + redeem** — двойной gate (supersedes v0.1 club-access flow).
- **Только org invitations Logto** — избыточно для single-club; one-time token проще.

## 📎 Последствия

- Фронт: guard `requiresMember` ≡ `isAuthenticated` (Logto).
- BFF: `POST /invites`, `GET /invites/resolve?code=`, Management API M2M.
- Logto Console: disable public registration; M2M app для BFF.
- Docs: [club-access.md](../../01-goal/club-access.md), [logto-setup.md](../../14-frontend/logto-setup.md).

## 🔗 Связанные ADR

- Supersedes invite-gate части v0.1 club-access (redeem для доступа).

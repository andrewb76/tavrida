# Logto — настройка (Cloud → self-host)

> **Статус:** Cloud (SaaS) для dev/staging · self-host — позже с тем же env-контрактом.  
> **Модель доступа:** [ADR-012](../03-architecture/adr/012-club-invite-via-logto.md) · [club-access.md](../01-goal/club-access.md)

## Кратко

| | |
|---|---|
| **Member** | Любой пользователь с JWT Logto нашего tenant |
| **Инвайт** | Magic link / код `TAV-…` → регистрация нового пользователя (sign-up выключен) + реферал |
| **Visitor** | Не вошёл — лендинг, `/join` |

Без Logto env фронт работает в **dev/mock** (`signInDev`).

---

## 1. Logto Cloud

1. [cloud.logto.io](https://cloud.logto.io) → tenant.
2. **Sign-in experience** → **Disable user registration** (invite-only).
3. **Applications → Single page app → Vue** (first-party, не Third-party).
4. Redirect URIs:

| Поле | Local dev |
|------|-----------|
| Redirect | `http://localhost:5173/callback` |
| Sign-out | `http://localhost:5173/` |
| CORS | `http://localhost:5173` |

5. **M2M app** (для BFF, позже): Management API → `one-time-tokens`.
6. Env в корневом `.env.local`:

```env
VITE_LOGTO_ENDPOINT=https://<tenant>.logto.app
VITE_LOGTO_APP_ID=<app-id>
```

```bash
pnpm check:logto
pnpm --filter @tavrida/frontend dev
```

---

## 2. Поток invite (новая модель)

```mermaid
sequenceDiagram
  participant M as Member
  participant F as Frontend
  participant B as BFF
  participant L as Logto
  participant V as Guest

  M->>F: /invites → создать
  F->>B: POST /invites
  B->>L: one-time token
  B-->>M: code TAV-… + link

  V->>F: /join?code=TAV-…
  F->>B: GET /invites/resolve
  F->>L: signIn(one_time_token)
  L->>F: /callback
  F->>V: /app (member)
```

- **Существующий пользователь Logto** — «Войти» на лендинге, без инвайта.
- **Новый пользователь** — только по `/join` (код или ссылка).

---

## 3. Код во фронте

| Файл | Роль |
|------|------|
| `src/config/logto.ts` | env, redirect URIs |
| `src/composables/useAuth.ts` | `signIn`, `signInWithInvite` |
| `src/views/public/JoinView.vue` | код / ссылка → Logto |
| `src/views/member/InvitesView.vue` | выдача приглашений |
| `src/services/invite.ts` | mock → BFF contract |

---

## 4. BFF (целевой контракт)

Полный контракт: [bff/invites-api.md](../05-microservices/bff/invites-api.md).

```http
POST /api/v1/invites
GET  /api/v1/invites/resolve?code=
POST /api/v1/invites/claim
```

BFF внутри: Logto Management API `POST /api/one-time-tokens`, сохранение `code → token, inviterId` в `user-profile`.

---

## 5. Troubleshooting

См. предыдущие разделы про `invalid_scope`, `invalid_client`, `RouterView` в layouts.

---

## Связанные документы

- [club-access.md](../01-goal/club-access.md)
- [frontend README](./README.md)

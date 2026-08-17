# ✉️ BFF API — инвайты (Logto createUser + loginHint)

> **Статус:** spec ready · **Версия:** 0.2  
> **ADR:** [012-club-invite-via-logto](../../03-architecture/adr/012-club-invite-via-logto.md)  
> **Продукт:** [club-access.md](../../01-goal/club-access.md)

BFF **оркестрирует** invite flow: Logto Management API (`POST /api/users`) + `user-profile` (код `TAV-…`, `inviterId`). Это **не** pass-through proxy.

---

## 🎯 Модель

| Правило | Значение |
|---------|----------|
| Member | JWT Logto tenant = доступ в клуб |
| Инвайт | Разрешает **регистрацию** нового пользователя + фиксирует **реферал** |
| Код `TAV-XXXX-XXXX` | Человекочитаемый alias ссылки `/join?code=…` |
| Ссылка | `/join?code=TAV-…` |

Пользователи, созданные в Logto Console вручную, — members без `inviterId` (bootstrap).

---

## 🏗️ Архитектура

```mermaid
sequenceDiagram
  participant F as Frontend
  participant B as BFF
  participant L as Logto M2M
  participant UP as user-profile

  Note over F,UP: Создание (member)
  F->>B: POST /invites { email? }
  B->>L: POST /api/users (createUser)
  B->>UP: POST /internal/v1/invites { logtoUserId }
  B-->>F: { code, link, expiresAt }

  Note over F,UP: Вход гостя
  F->>B: GET /invites/resolve?code=
  B->>UP: lookup code
  B-->>F: { email, inviterId, inviteCodeId }
  F->>L: signIn({ loginHint: email })
  L->>L: sign-up: email verification → password
  L->>F: /callback JWT

  Note over F,UP: После callback
  F->>B: POST /invites/claim { inviteCodeId? }
  B->>UP: set inviterId (once)
  UP-->>rating: invitation.redeemed
```

### Ответственность слоёв

| Слой | Делает |
|------|--------|
| **BFF** | JWT check, лимиты plan-config, вызов Logto M2M, compose `link`, resolve/claim |
| **Logto M2M** | `POST /api/users` (создание пользователя) |
| **user-profile** | Хранит `invite_code` (logto_user_id), `invitation`, `inviterId` |
| **Frontend** | `/join`, `signIn({ loginHint: email })` → Logto sign-up flow |

---

## 📋 Endpoints (публичный BFF)

| Method | Path | Auth | Описание |
|--------|------|------|----------|
| `POST` | `/api/v1/invites` | Member JWT | Создать приглашение |
| `GET` | `/api/v1/invites` | Member JWT | Мои коды (история) |
| `GET` | `/api/v1/invites/resolve` | **Нет** | Код → email + inviterId |
| `POST` | `/api/v1/invites/claim` | Member JWT | Зафиксировать `inviterId` |

---

## `POST /api/v1/invites`

Создаёт invite: Logto user + запись в `user-profile`.

### Request

```http
POST /api/v1/invites
Authorization: Bearer {member-jwt}
Content-Type: application/json

{
  "email": "friend@example.com"
}
```

| Поле | Тип | Обяз. | Описание |
|------|-----|-------|----------|
| `email` | string (email) | нет | Если не задан — BFF генерирует `invite-{id}@invite.tavrida-lot.localhost` |

### Поведение BFF

1. Validate JWT → `issuerId = sub`.
2. Check Keto: caller is member (JWT достаточен в v1).
3. Check `club.member.invite.monthlyMax` via plan-config (admin /
   `CLUB_INVITES_UNLIMITED_ISSUER_IDS` — skip). Unknown policy or unavailable
   plan-config returns `503`; quota enforcement never falls back to env.
4. `POST {LOGTO_ENDPOINT}/api/users` (M2M token):

```json
{
  "primaryEmail": "friend@example.com",
  "name": "friend"
}
```

5. `POST user-profile /internal/v1/invites`:

```json
{
  "issuerId": "uuid",
  "logtoUserId": "logto-user-id",
  "email": "friend@example.com",
  "expiresAt": "2026-07-23T12:00:00Z",
  "maxUses": 1
}
```

6. user-profile генерирует уникальный `code` формата `TAV-XXXX-XXXX`.

### Response `201`

```json
{
  "id": "uuid",
  "code": "TAV-K7HM-9R2Q",
  "link": "https://tavrida-lot.ru/join?code=TAV-K7HM-9R2Q",
  "email": "friend@example.com",
  "expiresAt": "2026-07-23T12:00:00Z",
  "createdAt": "2026-07-09T20:00:00Z"
}
```

`link` собирает BFF из `FRONTEND_ORIGIN` + `code`.

### Ошибки

| HTTP | type | Когда |
|------|------|-------|
| 401 | `unauthorized` | Нет JWT |
| 403 | `forbidden` | Лимит `club.member.invite.monthlyMax` |
| 422 | `validation-error` | Невалидный email |
| 502 | `upstream-error` | Logto M2M / user-profile недоступен |

### Side effects (опционально v1.1)

- Email connector: BFF или Logto отправляет письмо с `link` если `email` задан.
- Audit log: `invite.created`.

---

## `GET /api/v1/invites`

Список кодов текущего member.

### Request

```http
GET /api/v1/invites?limit=20&cursor=
Authorization: Bearer {member-jwt}
```

### Response `200`

```json
{
  "data": [
    {
      "id": "uuid",
      "code": "TAV-K7HM-9R2Q",
      "link": "https://tavrida-lot.ru/join?code=TAV-K7HM-9R2Q",
      "email": "friend@example.com",
      "usesCount": 1,
      "maxUses": 1,
      "expiresAt": "2026-07-23T12:00:00Z",
      "createdAt": "2026-07-09T20:00:00Z",
      "status": "redeemed"
    }
  ],
  "pagination": { "nextCursor": null, "hasMore": false }
}
```

| `status` | Значение |
|----------|----------|
| `active` | Не использован, не истёк |
| `redeemed` | `usesCount >= maxUses` |
| `expired` | `expiresAt < now` |

Proxy → `user-profile GET /internal/v1/invites?issuerId={sub}`.

---

## `GET /api/v1/invites/resolve`

**Публичный** endpoint для гостя перед Logto sign-in.

### Request

```http
GET /api/v1/invites/resolve?code=TAV-K7HM-9R2Q
```

| Query | Обяз. | Описание |
|-------|-------|----------|
| `code` | да | Код `TAV-…` |

### Response `200`

```json
{
  "email": "friend@example.com",
  "inviterId": "uuid",
  "inviteCodeId": "uuid",
  "code": "TAV-K7HM-9R2Q"
}
```

| Поле | Назначение |
|------|------------|
| `email` | `loginHint` в Logto SDK (`signIn({ loginHint: email })`) |
| `inviterId` | Для `claim` после входа (фронт кладёт в sessionStorage) |
| `inviteCodeId` | Опционально в `claim` для идемпотентности |

### Ошибки

| HTTP | type | detail (пример) |
|------|------|-----------------|
| 404 | `not-found` | Код не найден |
| 410 | `invite-expired` | Срок истёк |
| 409 | `invite-exhausted` | Код уже использован |
| 429 | `rate-limit-exceeded` | Brute-force на resolve |

Rate limit: **30 req/min per IP** (anonymous).

### Безопасность

- Не отдавать список всех кодов — только resolve по точному `code`.
- После успешного claim инкремент `usesCount` (не на resolve).

---

## `POST /api/v1/invites/claim`

Фиксирует реферальную связь после **первого** успешного входа по invite. **Не** открывает доступ в клуб (доступ уже есть через JWT).

### Request

```http
POST /api/v1/invites/claim
Authorization: Bearer {member-jwt}
Content-Type: application/json

{
  "inviteCodeId": "uuid"
}
```

| Поле | Тип | Обяз. | Описание |
|------|-----|-------|----------|
| `inviteCodeId` | UUID | нет* | Предпочтительно — из `resolve` |
| `inviterId` | UUID | нет* | Fallback если фронт сохранил из resolve |

\* Нужен хотя бы один: `inviteCodeId` или `inviterId`.

### Поведение BFF

1. `sub` из JWT.
2. `POST user-profile /internal/v1/invites/claim`:

   - Если у `userId` уже есть `inviterId` → **200 noop** (идемпотентно).
   - Иначе: записать `inviterId`, `invitationAcceptedAt`, инкремент `usesCount` на коде.
   - Emit `invitation.redeemed` → rating.

### Response `200`

```json
{
  "userId": "uuid",
  "inviterId": "uuid",
  "invitationAcceptedAt": "2026-07-09T20:05:00Z",
  "claimed": true
}
```

`claimed: false` — если связь уже была (повторный claim).

### Ошибки

| HTTP | type | Когда |
|------|------|-------|
| 401 | `unauthorized` | Нет JWT |
| 404 | `not-found` | `inviteCodeId` не существует |
| 409 | `conflict` | `inviterId` не совпадает с кодом (tamper) |

---

## Logto Management API (BFF internal)

### M2M authentication

| Env | Описание |
|-----|----------|
| `LOGTO_ENDPOINT` | `https://{tenant}.logto.app` |
| `LOGTO_M2M_APP_ID` | Machine-to-machine application |
| `LOGTO_M2M_APP_SECRET` | Client secret |
| `LOGTO_M2M_RESOURCE` | `https://{tenant}.logto.app/api` (Cloud) · `https://default.logto.app/api` (OSS) |

Получение token:

```http
POST {LOGTO_ENDPOINT}/oidc/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={LOGTO_M2M_APP_ID}
&client_secret={LOGTO_M2M_APP_SECRET}
&resource={LOGTO_M2M_RESOURCE}
&scope=all
```

### Create user

```http
POST {LOGTO_ENDPOINT}/api/users
Authorization: Bearer {m2m-access-token}
Content-Type: application/json

{
  "primaryEmail": "friend@example.com",
  "name": "friend"
}
```

Response (пример):

```json
{
  "id": "usr_5xK2mP8qR3"
}
```

> Logto: [Create user](https://docs.logto.io/using-logto-oss/management-api#create-a-user)

### Logto Console checklist

- [ ] Sign-in experience → **Disable user registration** (invite-only)
- [ ] Sign-up: **Email + Password + Verify email** (для invite flow)
- [ ] Sign-in: **Email + Password**
- [ ] SPA app (frontend) — redirect URIs
- [ ] M2M app — Management API scopes
- [ ] (Опционально) Email connector для писем с invite

### Dev без M2M

Если `LOGTO_M2M_APP_ID` / `LOGTO_M2M_APP_SECRET` пусты, BFF генерирует `dev-*` user ids и сохраняет их в user-profile. Logto Cloud **не примет** такие id — для полного E2E нужен M2M app.

---

## user-profile (internal)

BFF вызывает:

| Method | Path | Описание |
|--------|------|----------|
| `POST` | `/internal/v1/invites` | Сохранить code + logtoUserId |
| `GET` | `/internal/v1/invites` | Список по `issuerId` |
| `GET` | `/internal/v1/invites/resolve` | Lookup by `code` |
| `POST` | `/internal/v1/invites/claim` | Записать invitation |
| `POST` | `/internal/v1/profile/ensure` | Профиль при первом JWT (без inviter) |

### `invite_code` (доп. поля для v0.1)

| Поле | Тип | Описание |
|------|-----|----------|
| `logto_user_id` | varchar | Logto user ID |
| `email` | varchar nullable | Target email |
| `status` | enum | `active` \| `redeemed` \| `expired` |

---

## События

| Event | Producer | Payload |
|-------|----------|---------|
| `invitation.redeemed` | user-profile | `{ inviteeId, inviterId, inviteCodeId }` |

Consumer: `rating` — referral tree ([karma-and-rating.md](../../01-goal/karma-and-rating.md)).

---

## Bootstrap (день 0)

1. Первый вход через Logto → скопировать `sub` с `/profile/me`.
2. Keto: `docker compose -f docker/compose/infra.local.yml up -d` (или `pnpm keto:up`).
3. Admin tuple: `pnpm grant:admin <logto_sub>` — см. [bootstrap-admin.md](../../09-security/bootstrap-admin.md).
4. Неограниченные `POST /invites` для admin (Keto check в BFF).
5. Первые invite-ссылки раздаются вручную.

**Без Keto (временно):** `CLUB_INVITES_UNLIMITED_ISSUER_IDS=<sub>` в `.env.local`.

### Smoke: claim после Logto callback

Путь фронта: resolve → Logto signIn(loginHint) → sign-up flow → callback → `POST /api/v1/invites/claim` (JWT + `inviteCodeId` / sessionStorage).

Локально без браузера: unit/orchestration test `invites.service.test.ts` (mock Logto). Ручной smoke:

1. Member создаёт invite → открыть `link` в инкогнито.
2. Пройти Logto sign-up flow (email verification → password) → после callback фронт должен вызвать claim (без 4xx/5xx в Network).
3. Повторный claim → `claimed: false` (идемпотентность).
4. В RMQ (если подключён) — одно событие `invitation.redeemed` на первый claim.

---

## Окружение BFF (дополнение)

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `LOGTO_M2M_APP_ID` | да | M2M для Management API |
| `LOGTO_M2M_APP_SECRET` | да | Secret |
| `LOGTO_M2M_RESOURCE` | да | Management API resource |
| `FRONTEND_ORIGIN` | да | `https://tavrida-lot.ru` — для `link` |
| `USER_PROFILE_URL` | да | Upstream |
| `CLUB_INVITE_VALIDITY_DAYS` | нет | **deprecated** — fallback если settings недоступен; источник: `club.invite.validityDays` |
| `CLUB_INVITES_UNLIMITED_ISSUER_IDS` | нет | CSV Logto `sub` без лимита (fallback без Keto) |
| `KETO_READ_URL` | нет | `http://localhost:4466` — admin check для invite quota |
| `KETO_NAMESPACE` | нет | default `TavridaLot` |
| `KETO_PLATFORM_OBJECT` | нет | default `platform:tavrida-lot` |
| `KETO_ADMIN_RELATION` | нет | default `admin` |

См. [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md) · [bootstrap-admin.md](../../09-security/bootstrap-admin.md).

---

## Реализация (чеклист)

- [x] NestJS `InvitesController` + `LogtoManagementClient` (`services/bff`)
- [x] user-profile internal `/internal/v1/invites/*` (`services/user-profile`)
- [x] Rate limiter на `resolve` (30 req/min per IP)
- [x] Idempotent `claim`
- [x] OpenAPI fragment в `06-api/invites-api.md`
- [x] `club.invite.validityDays` / `club.invite.codeType` — BFF читает из scalar-config (`ClubSettingsReader`)
- [x] `club.registration.inviteOnly` — `GET /api/v1/settings/public` + landing/join UI
- [x] `club.member.invite.monthlyMax` — fail-closed BFF quota via plan-config
- [x] E2E (BFF orchestration test): create → resolve → mock signIn → claim (`invites.service.test.ts`)
- [x] RMQ `invitation.redeemed` publish из user-profile при первом claim (consumers — planned)
- [x] Migrate from one-time token to `createUser` + `loginHint` (ADR-012 v0.2)

---

## 🔗 Связанные разделы

- [bff/README.md](./README.md)
- [user-profile](../user-profile/README.md)
- [logto-setup.md](../../14-frontend/logto-setup.md)
- [06-api](../../06-api/README.md)

---

**v0.1-spec** · ADR-012

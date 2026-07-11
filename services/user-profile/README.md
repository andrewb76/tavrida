# user-profile

Internal profile + invite storage. Port **3007**.

```bash
pnpm exec turbo run dev --filter=@tavrida/user-profile
```

Requires PostgreSQL (`DATABASE_URL` or `DB_*` from repo `.env.local`).

Internal invites API: `POST/GET /internal/v1/invites`, `GET /internal/v1/invites/resolve`, `POST /internal/v1/invites/claim`.

Users API: `GET /internal/v1/users`, `POST /internal/v1/users/sync-logto`, `POST /internal/v1/users/ensure`, `POST /internal/v1/users/:id/mark-deleted`.

Logto sync: [logto-webhooks.md](../../docs/14-frontend/logto-webhooks.md) · backfill: `pnpm sync:logto-users`.

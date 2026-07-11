# user-profile

Internal profile + invite storage. Port **3007**.

```bash
pnpm exec turbo run dev --filter=@tavrida/user-profile
```

Requires PostgreSQL (`DATABASE_URL` or `DB_*` from repo `.env.local`).

Internal invites API: `POST/GET /internal/v1/invites`, `GET /internal/v1/invites/resolve`, `POST /internal/v1/invites/claim`.

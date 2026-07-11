# bff

Backend-for-Frontend. Port **3000**, prefix **`/api/v1`**.

```bash
pnpm exec turbo run dev --filter=@tavrida/bff
```

Invite endpoints: [docs/05-microservices/bff/invites-api.md](../../docs/05-microservices/bff/invites-api.md)

Requires `user-profile` on `USER_PROFILE_URL` (default `http://localhost:3007`).

Logto M2M optional in dev — without `LOGTO_M2M_*` BFF generates dev one-time tokens.

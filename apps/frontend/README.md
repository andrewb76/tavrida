# @tavrida/frontend

Vue 3 SPA — Tavrida Lot.

## Quick start

```bash
# from repo root
pnpm install
pnpm setup:env          # creates .env.local from .env.example
pnpm check:logto        # verify Logto env (optional)

pnpm --filter @tavrida/frontend dev
```

Open http://localhost:5173

Env vars load from **monorepo root** `.env.local` (see [`vite.config.ts`](./vite.config.ts) `envDir`).

## Auth modes

| Mode | When | Flow |
|------|------|------|
| **Mock** | `VITE_LOGTO_*` not set | `/invite` → any code → dev session |
| **Logto Cloud** | `VITE_LOGTO_ENDPOINT` + `VITE_LOGTO_APP_ID` | OIDC PKCE → `/callback` → redeem invite |

Full Logto setup: [logto-setup.md](../../docs/14-frontend/logto-setup.md)

### Logto Cloud (recommended)

1. [cloud.logto.io](https://cloud.logto.io) → tenant → **Single Page App**
2. Redirect URIs: `http://localhost:5173/callback`, sign-out: `http://localhost:5173/`
3. In root `.env.local`:

```env
VITE_LOGTO_ENDPOINT=https://<tenant>.logto.app
VITE_LOGTO_APP_ID=<app-id>
```

4. `pnpm check:logto` → restart dev server

### Local Logto OSS (optional)

```bash
docker compose -f docker/compose/logto.local.yml up -d
# Admin: http://localhost:3302 → create SPA → use endpoint http://localhost:3301
```

## Build

```bash
pnpm --filter @tavrida/frontend build
pnpm --filter @tavrida/frontend preview
```

## Routes

See [screen-tree](../../docs/11-ux-ui/screen-tree.md) and [14-frontend](../../docs/14-frontend/README.md).

Stack: [stack-decisions.md](../../docs/14-frontend/stack-decisions.md)

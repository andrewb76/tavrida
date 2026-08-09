# Hawk.so — deprecated (removed)

> **Статус:** removed · **2026-08-09**
>
> Hawk.so Integration Token (JWT) removal — workspace package `@tavrida/hawk` caused broken
> symlinks in Docker images (`pnpm deploy --legacy`), leading to `Cannot find module '@hawk.so/nodejs'`
> runtime crashes. Hawk has been fully removed from the codebase.
>
> **Replacement:** Sentry (see backlog).

## Что было удалено

- `packages/hawk/` — workspace package `@tavrida/hawk`
- All NestJS services: `initHawkNode()` + `attachHawkToNestApp()` calls
- Frontend: `src/hawk.ts` + `@hawk.so/browser` + `@hawk.so/vite-plugin`
- Docker Swarm: `hawk_token` secret, `HAWK_TOKEN` env vars
- CI: `HAWK_TOKEN` / `VITE_HAWK_TOKEN` build args and secret sync

## Backlog

- [ ] Sentry integration (error tracking replacement)
  - Backend: `@sentry/nestjs`
  - Frontend: `@sentry/vue` + `@sentry/vite-plugin` (sourcemaps)
  - DSN as Swarm secret → `SENTRY_DSN`

---

**Автор:** команда разработки · **Версия:** removed

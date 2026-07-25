# 🐛 Sentry SDK → Hawk.so (Sentry-compatible DSN)

> **Статус:** in progress · **Версия:** 0.3  
> **Backend:** DSN `k1.hawk.so` через официальный `@sentry/node`  
> **Frontend:** `@sentry/vue` + тот же / отдельный browser DSN

Hawk принимает [DSN Sentry-интеграции](https://docs.hawk.so/integrations) — менять SDK на `@hawk.so/*` не обязательно.

## ⚙️ Backend (NestJS)

Пакет: [`@tavrida/sentry`](../../packages/sentry) (`initSentryNode` + `attachSentryToNestApp`).

В каждом `services/*/src/main.ts`:

```ts
import './config/hydrate-secrets'
import { attachSentryToNestApp, initSentryNode } from '@tavrida/sentry'

async function bootstrap() {
  initSentryNode({ service: 'billing' })
  const app = await NestFactory.create(AppModule)
  attachSentryToNestApp(app)
  // …
}
```

Env:

| Variable | Где | Описание |
|----------|-----|----------|
| `SENTRY_DSN` | Nest + Swarm secret | Hawk/Sentry DSN |
| `SENTRY_ENVIRONMENT` | Swarm `dev` | `dev` / `production` |
| `SENTRY_RELEASE` | Swarm = `GIT_SHA` | release tag в UI |
| `SENTRY_TRACES_SAMPLE_RATE` | опц. | override (иначе 1.0 local / 0.2 prod) |

Hydrate: `SENTRY_DSN_FILE` → `SENTRY_DSN` (как остальные Swarm secrets).

## 🖥️ Frontend (Vue)

`apps/frontend/src/sentry.ts` — `initSentryVue(app, router)` после `app.use(router)`.

Build-time (Vite / Docker):

| Variable | Описание |
|----------|----------|
| `VITE_SENTRY_DSN` | Browser DSN (публичный ключ; в бандле) |
| `VITE_SENTRY_ENVIRONMENT` | default `dev` на Swarm build |
| `VITE_SENTRY_RELEASE` | = `GIT_SHA` |

CI: `VITE_SENTRY_DSN` берётся из secret `SENTRY_DSN` (один проект Hawk на FE+BE для MVP; позже — два Integration DSN).

## 🔐 Dev Swarm / GitHub

1. Environment `dev` → Secret **`SENTRY_DSN`** = Hawk Integration DSN.
2. **Sync secrets (dev)** или Deploy (ensure secrets) → `tavrida_dev_sentry_dsn`.
3. Redeploy с rebuild frontend (`skip_build=false`), чтобы вшить `VITE_SENTRY_DSN`.

Локально: `.env.local` / `docker/swarm/dev.secrets.env` (не коммитить).

## ✅ Проверка

```bash
# backend — unhandled throw / 500 после attach
# frontend — в консоли: throw new Error('sentry smoke')
```

Событие должно появиться в [Hawk](https://hawk.so/) (гараж проекта). Допустима небольшая задержка.

## 🔗 Связанные разделы

- [Observability](./README.md)
- [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md)
- [github-actions.md](../04-deployment/github-actions.md)
- [Grafana Cloud](./grafana-setup.md) (отложено)

---

**Автор:** команда разработки · **Версия:** 0.3

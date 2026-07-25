# 🐛 Sentry SDK → Hawk.so (Sentry-compatible DSN)

> **Статус:** in progress · **Версия:** 0.4  
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

1. Environment `dev` → **`SENTRY_DSN`** = Hawk Integration DSN  
   (предпочтительно **Secret**; Variable тоже подхватится через `secrets || vars` в Deploy/Sync).
2. **Sync secrets (dev)** → Swarm `tavrida_dev_sentry_dsn`.
3. **Deploy** с rebuild frontend (`skip_build=false`), чтобы вшить `VITE_SENTRY_DSN` в бандл.

Локально: `.env.local` / `docker/swarm/dev.secrets.env` (не коммитить).

## ✅ Проверка

Hawk envelope принимает наш DSN (`POST …/api/0/envelope/` → 200). Если в UI пусто — обычно DSN не дошёл до runtime/бандла.

```bash
# 1) Local BE — в логе старта должно быть:
#    [sentry] enabled for bff → k1.hawk.so env=…
#    иначе: [sentry] disabled … SENTRY_DSN missing

# 2) Local FE — в консоли браузера:
#    [sentry] enabled for frontend → k1.hawk.so
#    затем: throw new Error('sentry smoke')
#    Network: POST https://k1.hawk.so/api/0/envelope/ → 200

# 3) Swarm Nest:
#    docker service logs tavrida-dev_bff | grep '\[sentry\]'
#    secret: docker secret ls | grep sentry
```

Событие в [Hawk](https://hawk.so/) (гараж). Допустима небольшая задержка.

### Частые ошибки

| Симптом | Причина |
|---------|---------|
| `[sentry] disabled` | нет `SENTRY_DSN` / не hydrate из `SENTRY_DSN_FILE` |
| FE без `[sentry] enabled` | образ собран без `VITE_SENTRY_DSN` → redeploy **с build** |
| Deploy sync падает на sentry | пустой Secret **и** Variable в env `dev` |
| DSN только в Variables | раньше Deploy читал только `secrets.*` — теперь `secrets \|\| vars` |

## 🔗 Связанные разделы

- [Observability](./README.md)
- [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md)
- [github-actions.md](../04-deployment/github-actions.md)
- [Grafana Cloud](./grafana-setup.md) (отложено)

---

**Автор:** команда разработки · **Версия:** 0.4

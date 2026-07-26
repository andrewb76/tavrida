# 🦅 Hawk.so — native catchers

> **Статус:** in progress · **Версия:** 0.5  
> **Backend:** [`@hawk.so/nodejs`](https://github.com/codex-team/hawk.nodejs) через [`@tavrida/hawk`](../../packages/hawk)  
> **Frontend:** [`@hawk.so/browser`](https://github.com/codex-team/hawk.javascript) + [`@hawk.so/vite-plugin`](https://github.com/codex-team/hawk.vite.plugin) (sourcemaps)

Нужен **Integration Token** из настроек проекта в [Hawk Garage](https://garage.hawk.so) (обычно JWT `eyJ…`).  
Это **не** Sentry-compatible DSN (`https://…@k1.hawk.so/…`) — DSN работал только со старым `@sentry/*` SDK.

Пакеты `@hawk.so/nodejs` / `@hawk.so/browser` — **AGPL-3.0**; vite-plugin — MIT.

## ⚙️ Backend (NestJS)

Пакет: [`@tavrida/hawk`](../../packages/hawk) (`initHawkNode` + `attachHawkToNestApp`).

В каждом `services/*/src/main.ts`:

```ts
import './config/hydrate-secrets'
import { attachHawkToNestApp, initHawkNode } from '@tavrida/hawk'

async function bootstrap() {
  initHawkNode({ service: 'billing' })
  const app = await NestFactory.create(AppModule)
  attachHawkToNestApp(app)
  // …
}
```

Env:

| Variable | Где | Описание |
|----------|-----|----------|
| `HAWK_TOKEN` | Nest + Swarm secret | Integration Token |
| `HAWK_ENVIRONMENT` | Swarm `dev` | `dev` / `production` |
| `HAWK_RELEASE` | Swarm = `GIT_SHA` | release в UI + sourcemaps |

Hydrate: `HAWK_TOKEN_FILE` → `HAWK_TOKEN`.

## 🖥️ Frontend (Vue)

`apps/frontend/src/hawk.ts` — `initHawkVue(app)` после `app.use(router)`.

`vite.config.ts` — `@hawk.so/vite-plugin` (upload sourcemaps), если задан `HAWK_TOKEN` или `VITE_HAWK_TOKEN`.

Build-time (Vite / Docker):

| Variable | Описание |
|----------|----------|
| `VITE_HAWK_TOKEN` | Integration Token в бандле. CI: secret/var или fallback на `HAWK_TOKEN` |
| `VITE_HAWK_ENVIRONMENT` | default `dev` на Swarm build |
| `VITE_HAWK_RELEASE` | = `GIT_SHA` (совпадает с `window.HAWK_RELEASE` от vite-plugin) |
| `HAWK_TOKEN` | для upload sourcemaps в Docker build (не обязан быть `VITE_*`) |

## 🔐 Dev Swarm / GitHub

1. Environment `dev` → **`HAWK_TOKEN`** = Integration Token (Secret предпочтительно).
2. **Sync secrets (dev)** → Swarm `tavrida_dev_hawk_token` (старый `tavrida_dev_sentry_dsn` можно удалить после ротации).
3. **Deploy** с rebuild frontend (`skip_build=false`), чтобы вшить `VITE_HAWK_TOKEN` и залить maps.

Локально: `.env.local` / `docker/swarm/dev.secrets.env` (не коммитить).

## ✅ Проверка

```bash
# 1) Local BE — в логе старта:
#    [hawk] enabled for bff env=…
#    иначе: [hawk] disabled … HAWK_TOKEN missing

# 2) Local FE — консоль:
#    [hawk] enabled for frontend env=…
#    затем: __tavridaHawkSmoke()
#    или hawk.test() если доступен инстанс

# 3) Swarm Nest:
#    docker service logs tavrida-dev_bff | grep '\[hawk\]'
#    secret: docker secret ls | grep hawk
```

Событие в [Hawk](https://garage.hawk.so/). Если **402** — квота/биллинг аккаунта Hawk, не баг SDK.

### Частые ошибки

| Симптом | Причина |
|---------|---------|
| `[hawk] disabled` / «looks like a DSN URL» | в токене лежит старый Sentry DSN — нужен Integration Token |
| FE без `[hawk] enabled` | образ без `VITE_HAWK_TOKEN` → redeploy **с build** |
| Deploy sync: placeholder `__unset__` | нет `HAWK_TOKEN` — Nest/FE no-op; задать токен + Sync `--force` |
| CI audit на axios | overridden ≥1.13.5 (hawk.nodejs pins 0.21) |
| Sourcemaps не матчятся | разный `release` у plugin и catcher |

## 🔗 Связанные разделы

- [Observability](./README.md)
- [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md)
- [github-actions.md](../04-deployment/github-actions.md)
- [Grafana Cloud](./grafana-setup.md) (отложено)

---

**Автор:** команда разработки · **Версия:** 0.5

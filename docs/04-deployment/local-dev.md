# 💻 Локальная разработка

> **Статус:** spec ready · **Версия:** 0.2

## 🎯 Минимальный путь (monorepo)

```bash
pnpm install
cp .env.example .env.local   # заполнить секреты
pnpm dev                     # turbo run dev — все packages с dev script
```

Фильтр одного сервиса:

```bash
pnpm exec turbo run dev --filter=@tavrida/billing
pnpm exec turbo run dev --filter=@tavrida/bff --filter=@tavrida/user-profile
```

## ✉️ Invites (BFF + user-profile)

1. PostgreSQL из `docker/compose/infra.local.yml` (schema `user_profile` создаётся автоматически).
2. Запустить `@tavrida/user-profile` (:3007), `@tavrida/billing` (:3001), `@tavrida/plan-config` (:3002), `@tavrida/scalar-config` (:3008), `@tavrida/forum` (:3009) и `@tavrida/bff` (:3000).
3. В `.env.local`: `VITE_USE_MOCK=false`, `VITE_API_BASE_URL=http://localhost:3000/api/v1`.
4. `LOGTO_M2M_*` — для реальных one-time tokens; без них BFF отдаёт `dev-*` токены (только локальная отладка).
5. Spec: [bff/invites-api.md](../05-microservices/bff/invites-api.md).

### Bootstrap admin (день 0)

После первого входа в Logto admin **ещё нет**. См. [bootstrap-admin.md](../09-security/bootstrap-admin.md):

```bash
pnpm keto:up
pnpm grant:admin <your_logto_sub>   # sub с /profile/me
```

## 🐳 Инфраструктура (целевой compose)

```bash
docker compose -f docker/compose/infra.local.yml up -d
```

Поднимает: PostgreSQL (`tavrida_lot`), Redis, RabbitMQ, MinIO, **imgproxy**, **Keto** (read `:4466` / write `:4467`, schema `keto`). Сеть `tavrida-local`.  
Только Keto: `pnpm keto:up`. Logto — Cloud или `logto.local.yml`.  
**Novu** (self-host, отдельно): `pnpm novu:up` — Dashboard `:4000`, API `:3020`. Чеклист ключа + workflow `tag-content`: [novu-local.md](./novu-local.md) ([ADR-019](../03-architecture/adr/019-novu-self-host.md)).  
Bootstrap admin: [bootstrap-admin](../09-security/bootstrap-admin.md).

## 🌐 Local URLs

| URL | Сервис |
|-----|--------|
| `http://localhost:5173` | Vue frontend |
| `http://localhost:3000/api/v1` | BFF |
| `http://localhost:3007` | user-profile (internal — debug only) |
| `http://localhost:3001` | billing (internal — debug only) |
| `http://localhost:3002` | plan-config (legacy: financial-policy — debug only) |
| `http://localhost:3008` | scalar-config (legacy: settings — debug only) |
| `http://localhost:3009` | forum (internal — debug only) |
| `http://localhost:9000` | MinIO (S3 API) |
| `http://localhost:8080` | imgproxy (resize / WebP для медиа) |
| `http://localhost:4000` | Novu Dashboard (`pnpm novu:up`) |
| `http://localhost:3020` | Novu API (self-host) |
| `http://localhost:3022` | Novu WS (Inbox realtime) |

Предпочтительно: **только BFF** с фронта; direct service ports — для отладки.

### Env vars (BFF → config services)

| Variable | Default local | Сервис |
|----------|---------------|--------|
| `PLAN_CONFIG_URL` | `http://localhost:3002` | plan-config (тарифы, plan variables) |
| `SCALAR_CONFIG_URL` | `http://localhost:3008` | scalar-config (скалярные ключи) |
| `FORUM_URL` | `http://localhost:3009` | forum (темы, комментарии) |

Retired legacy aliases: `FINANCIAL_POLICY_URL`, `SETTINGS_URL`.

### Порты (локально)

| Сервис | Env | Порт |
|--------|-----|------|
| bff | `BFF_PORT` | **3000** |
| billing | `BILLING_PORT` | 3001 |
| plan-config | `PLAN_CONFIG_PORT` | 3002 |
| auction | `AUCTION_PORT` | 3003 |
| subscriptions | `SUBSCRIPTIONS_PORT` | 3004 |
| deal-feedback | `DEAL_FEEDBACK_PORT` | 3006 |
| user-profile | `USER_PROFILE_PORT` | 3007 |
| scalar-config | `SCALAR_CONFIG_PORT` | 3008 |
| forum | `FORUM_PORT` | 3009 |
| notifications | `NOTIFICATIONS_PORT` | 3010 |
| marketplace | `MARKETPLACE_PORT` | **3011** |
| periods | `PERIODS_PORT` | 3014 |
| webhooks (draft) | — | **3015** |

**Не задавайте `PORT=3000` в `.env.local`** — при `pnpm dev` turbo передаёт один env всем процессам, и несколько сервисов попытаются занять один порт (`EADDRINUSE`). Используйте только `*_PORT` или полагайтесь на дефолты в `package.json` dev-скриптах.

## 🔐 Auth local

- **Logto Cloud** (рекомендуется): [logto-setup.md](../14-frontend/logto-setup.md) — `pnpm setup:env`, заполнить `VITE_LOGTO_*`
- **Logto OSS локально**: `docker compose -f docker/compose/logto.local.yml up -d` (admin :3302)
- **Без Logto**: mock auth на `/invite` (любой код)
- Keto: входит в `infra.local.yml` / `pnpm keto:up` — tuples в schema `keto`; bootstrap: [bootstrap-admin.md](../09-security/bootstrap-admin.md)

## 🩺 Проверка

```bash
curl http://localhost:3000/health
curl http://localhost:3007/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3008/health
curl http://localhost:3009/health
curl http://localhost:3000/api/v1/forum/categories
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/plans
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/wallets/balance
pnpm build   # monorepo build gate
```

## 🔗 Связанные разделы

- [AGENTS.md](../../AGENTS.md)
- [12-dev-process](../12-dev-process/README.md)
- [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

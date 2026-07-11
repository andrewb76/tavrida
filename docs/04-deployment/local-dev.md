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

Поднимает: PostgreSQL (`tavrida_lot`), Redis, RabbitMQ, MinIO. Сеть `tavrida-local`.  
**Keto** — `pnpm keto:up` (schema `keto` в Postgres, [bootstrap-admin](../09-security/bootstrap-admin.md)). Logto — Cloud или `logto.local.yml`.

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

Предпочтительно: **только BFF** с фронта; direct service ports — для отладки.

### Env vars (BFF → config services)

| Variable | Default local | Сервис |
|----------|---------------|--------|
| `PLAN_CONFIG_URL` | `http://localhost:3002` | plan-config (тарифы, plan variables) |
| `SCALAR_CONFIG_URL` | `http://localhost:3008` | scalar-config (скалярные ключи) |
| `FORUM_URL` | `http://localhost:3009` | forum (темы, комментарии) |

Legacy aliases (удалить после миграции кода): `FINANCIAL_POLICY_URL`, `SETTINGS_URL`.

## 🔐 Auth local

- **Logto Cloud** (рекомендуется): [logto-setup.md](../14-frontend/logto-setup.md) — `pnpm setup:env`, заполнить `VITE_LOGTO_*`
- **Logto OSS локально**: `docker compose -f docker/compose/logto.local.yml up -d` (admin :3302)
- **Без Logto**: mock auth на `/invite` (любой код)
- Keto: `pnpm keto:up` — tuples в schema `keto`; bootstrap: [bootstrap-admin.md](../09-security/bootstrap-admin.md)

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

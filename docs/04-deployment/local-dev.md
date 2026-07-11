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
2. Запустить `@tavrida/user-profile` (:3007), `@tavrida/settings` (:3008) и `@tavrida/bff` (:3000).
3. В `.env.local`: `VITE_USE_MOCK=false`, `VITE_API_BASE_URL=http://localhost:3000/api/v1`.
4. `LOGTO_M2M_*` — для реальных one-time tokens; без них BFF отдаёт `dev-*` токены (только локальная отладка).
5. Spec: [bff/invites-api.md](../05-microservices/bff/invites-api.md).

### Bootstrap admin (день 0)

После первого входа в Logto admin **ещё нет**. См. [bootstrap-admin.md](../09-security/bootstrap-admin.md):

```bash
docker compose -f docker/compose/keto.local.yml up -d
pnpm grant:admin <your_logto_sub>   # sub с /profile/me
```

## 🐳 Инфраструктура (целевой compose)

```bash
docker compose -f docker/compose/infra.local.yml up -d
```

Поднимает: PostgreSQL, Redis, RabbitMQ, MinIO. **Keto** — `docker/compose/keto.local.yml` ([bootstrap-admin](../09-security/bootstrap-admin.md)). Logto — Cloud или `logto.local.yml`.

## 🌐 Local URLs

| URL | Сервис |
|-----|--------|
| `http://localhost:5173` | Vue frontend |
| `http://localhost:3000/api/v1` | BFF |
| `http://localhost:3007` | user-profile (internal — debug only) |
| `http://localhost:3001` | billing (direct — debug only) |

Предпочтительно: **только BFF** с фронта; direct service ports — для отладки.

## 🔐 Auth local

- **Logto Cloud** (рекомендуется): [logto-setup.md](../14-frontend/logto-setup.md) — `pnpm setup:env`, заполнить `VITE_LOGTO_*`
- **Logto OSS локально**: `docker compose -f docker/compose/logto.local.yml up -d` (admin :3302)
- **Без Logto**: mock auth на `/invite` (любой код)
- Keto: `docker compose -f docker/compose/keto.local.yml up -d` — bootstrap: [bootstrap-admin.md](../09-security/bootstrap-admin.md)

## 🩺 Проверка

```bash
curl http://localhost:3000/health
curl http://localhost:3007/health
curl http://localhost:3001/health
curl http://localhost:3001/health/ready
pnpm build   # monorepo build gate
```

## 🔗 Связанные разделы

- [AGENTS.md](../../AGENTS.md)
- [12-dev-process](../12-dev-process/README.md)
- [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

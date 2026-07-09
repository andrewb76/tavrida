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
```

## 🐳 Инфраструктура (целевой compose)

```bash
docker compose -f docker/compose/infra.local.yml up -d
```

Поднимает: PostgreSQL, Redis, RabbitMQ, MinIO. Logto/Keto — отдельно или из matrix ([services-saas-matrix](../02-infrastructure/services-saas-matrix.md)).

## 🌐 Local URLs

| URL | Сервис |
|-----|--------|
| `http://localhost:5173` | Vue frontend |
| `http://localhost:3000/api/v1` | BFF |
| `http://localhost:3001` | billing (direct — debug only) |

Предпочтительно: **только BFF** с фронта; direct service ports — для отладки.

## 🔐 Auth local

- **Logto Cloud** (рекомендуется): [logto-setup.md](../14-frontend/logto-setup.md) — `pnpm setup:env`, заполнить `VITE_LOGTO_*`
- **Logto OSS локально**: `docker compose -f docker/compose/logto.local.yml up -d` (admin :3302)
- **Без Logto**: mock auth на `/invite` (любой код)
- Keto: локальный docker или `keto relation-tuple` CLI

## 🩺 Проверка

```bash
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

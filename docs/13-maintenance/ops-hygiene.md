# 🧹 Ops hygiene — регулярное сопровождение

> **Статус:** draft · **Версия:** 0.2 · **Дата:** 2026-07-16  
> **Аудитория:** dev, ops, AI-сессии

## 🎯 Назначение

**Ops hygiene** — регулярные, **воспроизводимые** действия, которые держат инфраструктуру, документацию и код в «чистом» и предсказуемом состоянии.

Не заменяет incident runbooks и не дублирует [security-ops.md](../09-security/security-ops.md) (ротация секретов, аудит). Здесь — **рутина «чтобы не копилось»**.

Связанные планы: [WORK-PLAN-NEXT.md](../00-meta/WORK-PLAN-NEXT.md) · [AGENT-TODO.todo](../../AGENT-TODO.todo)

---

## ☀️ Ежедневно

Для **каждой рабочей сессии** (dev или AI).

### Старт сессии

| # | Действие | Команда / файл |
|---|----------|----------------|
| 1 | Прочитать очередь задач | `AGENT-TODO.todo` — активные `☐` |
| 2 | Сверить фокус недели | [WORK-PLAN-NEXT.md](../00-meta/WORK-PLAN-NEXT.md) |
| 3 | Найти тему в индексе | [AGENT-DOCS-INDEX.md](../00-meta/AGENT-DOCS-INDEX.md) → колонка «Читать» |
| 4 | Поднять infra (если нужен E2E) | `docker compose -f docker/compose/infra.local.yml up -d` |

### Во время работы

| # | Действие | Когда |
|---|----------|-------|
| 5 | Сверять код со spec | README сервиса, ADR, event-catalog |
| 6 | Не коммитить мусор | `.vitepress/cache/`, `.env.local`, случайные бинарники `content/` |
| 7 | Тесты затронутого пакета | `pnpm exec turbo run test --filter=@tavrida/<pkg>` |

### Конец сессии / перед push

| # | Действие | Команда / файл |
|---|----------|----------------|
| 8 | `git status` — без cache и secrets | — |
| 9 | Обновить docs при смене поведения | см. § «После фичи» ниже |
| 10 | Закрыть пункты TODO / WORK-PLAN | `✔` + `@done(YY-MM-DD)` → Archive |

### Локальные health-checks (при отладке)

```bash
pg_isready -h localhost -U postgres
redis-cli ping
curl -s -u guest:guest http://localhost:15672/api/overview
curl -s http://localhost:4466/health/ready          # Keto
curl -s http://localhost:3003/health/ready          # auction (DB ping)
curl -X POST http://localhost:3002/internal/v1/subscription/renew/run
curl -X POST http://localhost:3003/internal/v1/auctions/close/run
```

---

## 📆 Еженедельно

| # | Действие | Где |
|---|----------|-----|
| 1 | Сверка DOCS-ROADMAP parity | [DOCS-ROADMAP.md](../00-meta/DOCS-ROADMAP.md) — ghost-планы, % готовности |
| 2 | Prune GHCR dev images | [prune-ghcr-dev.yml](../../.github/workflows/prune-ghcr-dev.yml) — пн 06:00 UTC или manual |
| 3 | Проверить dev Swarm health | `https://api.${DEV_DOMAIN}/health` · [README.dev.md](../../docker/swarm/README.dev.md) |
| 4 | Убедиться, что cron jobs живы | `plan-config-renew` (hourly renew/run) · auction `close/run` (manual local / ⏳ Swarm) |
| 5 | Обновить PROJECT-CONTEXT | Только при новом ADR или смене фазы |

---

## 🚀 Перед деплоем

Чеклист **перед merge в `master`** (автодеплой dev) или **ручным `deploy-dev.sh`**.

### Код и CI gate

```bash
pnpm install
pnpm lint
pnpm build                    # или turbo --filter affected
pnpm docs:build
pnpm exec turbo run test --filter=@tavrida/auction   # для затронутых сервисов
```

| # | Проверка | Критерий |
|---|----------|----------|
| 1 | Lint + build + docs:build | зелёный локально или в CI |
| 2 | Нет секретов в diff | `.env.local`, tokens, keys |
| 3 | Новые env задокументированы | [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) |
| 4 | Новые endpoints / events | README сервиса + [event-catalog.md](../03-architecture/event-catalog.md) |
| 5 | AGENT-DOCS-INDEX обновлён | строка темы, дата |
| 6 | Migrations expand-only | [migrations.md](../04-deployment/migrations.md) — job **до** rolling update |

### Dev Swarm (VPS)

| # | Действие | Команда |
|---|----------|---------|
| 1 | Sync secrets (если менялись) | `docker/swarm/sync-secrets-dev.sh` |
| 2 | Deploy | `deploy-dev.sh` или GitHub Actions workflow |
| 3 | Smoke после деплоя | `GET /health` + `GET /health/ready` на BFF и ключевых сервисах |
| 4 | Проверить renew cron | логи `plan-config-renew` |

См. [github-actions.md](../04-deployment/github-actions.md) · [swarm-stacks.md](../04-deployment/swarm-stacks.md).

### Proposal-only docs

Документы вроде [tariff-seller-buyer-proposal.md](../01-goal/tariff-seller-buyer-proposal.md) **не** каскадят в PLATFORM-REGISTRY / seed / код до командного консенсуса.

---

## ⏱️ Cron / batch jobs (автоматика)

| Job | Endpoint | Интервал | Dev Swarm | Local manual |
|-----|----------|----------|-----------|--------------|
| **Subscription renew** | `POST …/subscription/renew/run` | hourly | ✅ `plan-config-renew` | `curl -X POST http://localhost:3002/internal/v1/subscription/renew/run` |
| **Auction close** | `POST …/auctions/close/run` | hourly (рекомендуется) | ✅ `auction-close` sidecar | `curl -X POST http://localhost:3003/internal/v1/auctions/close/run` |

Оба endpoint **идемпотентны**. При `INTERNAL_SERVICE_TOKEN` — `Authorization: Bearer …` в curl/Swarm ([PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md)).

---

## 📚 После фичи (docs-first)

1. Spec / README сервиса.
2. [event-catalog.md](../03-architecture/event-catalog.md) — RMQ events.
3. [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) — env.
4. [AGENT-DOCS-INDEX.md](../00-meta/AGENT-DOCS-INDEX.md).
5. [WORK-PLAN-NEXT.md](../00-meta/WORK-PLAN-NEXT.md).
6. `AGENT-TODO.todo` → Archive.

Правила форматирования: [docs-guidelines.md](./docs-guidelines.md).

---

## 🐳 Локальная инфраструктура

```bash
docker compose -f docker/compose/infra.local.yml up -d
docker compose -f docker/compose/logto.local.yml up -d   # опционально
pnpm novu:up   # Novu CE — onboarding deferred, см. novu-local.md
```

**Порты:** не задавать глобальный `PORT=3000` в `.env.local` — только `*_PORT` ([local-dev.md](../04-deployment/local-dev.md)).

---

## 📬 Backlog (не блокирует hygiene)

| Тема | Статус |
|------|--------|
| Novu CE onboarding (Dashboard, API key, `tag-content`) | deferred — [novu-local.md](../04-deployment/novu-local.md) |
| Swarm `auction-close` hourly sidecar | ✅ dev Swarm |
| `subscription.activated` / `expired` из plan-config в RMQ | ⏳ WORK-PLAN |
| Digest CRON real delivery | после Novu |
| Ротация секретов prod (90d) | [security-ops.md](../09-security/security-ops.md) |

---

## 🔗 Связанные разделы

- [04-deployment/README.md](../04-deployment/README.md) — health checks, CI/CD
- [local-dev.md](../04-deployment/local-dev.md)
- [swarm-stacks.md](../04-deployment/swarm-stacks.md)
- [security-ops.md](../09-security/security-ops.md)
- [docs-guidelines.md](./docs-guidelines.md)

---

**Автор:** команда разработки · **Версия:** 0.2-draft

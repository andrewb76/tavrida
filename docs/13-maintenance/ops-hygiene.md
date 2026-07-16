# 🧹 Ops hygiene — регулярное сопровождение

> **Статус:** draft · **Версия:** 0.1 · **Дата:** 2026-07-16  
> **Аудитория:** dev, ops, AI-сессии

## 🎯 Назначение

**Ops hygiene** — набор регулярных, **воспроизводимых** действий, которые держат инфраструктуру, документацию и код в предсказуемом состоянии.

Не заменяет incident runbooks и не дублирует [security-ops.md](../09-security/security-ops.md) (ротация секретов, аудит). Здесь — **рутина «чтобы не копилось»**.

---

## 📅 Ритм (шпаргалка)

| Когда | Что | Где смотреть |
|-------|-----|--------------|
| **Начало сессии / задачи** | `AGENT-TODO.todo` + [WORK-PLAN-NEXT.md](../00-meta/WORK-PLAN-NEXT.md) + строка темы в [AGENT-DOCS-INDEX.md](../00-meta/AGENT-DOCS-INDEX.md) | `.cursor/rules/agent-tasks.mdc`, `docs-workflow.mdc` |
| **После фичи / ADR** | Обновить README сервиса, event-catalog, PLATFORM-SECRETS при новых env, строку индекса | [docs-guidelines.md](./docs-guidelines.md) |
| **Перед merge / релизом** | `pnpm lint` · `pnpm build` (или affected) · `pnpm docs:build` | CI: [github-actions.md](../04-deployment/github-actions.md) |
| **Hourly (dev Swarm)** | Автопродление подписок | `plan-config-renew` → `POST …/subscription/renew/run` |
| **Hourly (рекомендуется)** | Закрытие due-аукционов | `POST …/auctions/close/run` — см. § Cron ниже |
| **Weekly** | Prune GHCR dev images · сверка DOCS-ROADMAP parity | [prune-ghcr-dev workflow](../../.github/workflows/prune-ghcr-dev.yml) |
| **90d prod** | Ротация DB / API keys (чеклист) | [security-ops.md](../09-security/security-ops.md) |

---

## 🐳 Инфраструктура (local)

```bash
# Базовая платформа
docker compose -f docker/compose/infra.local.yml up -d

# Опционально: Logto local, Novu CE (отдельно — RAM)
docker compose -f docker/compose/logto.local.yml up -d
pnpm novu:up   # Novu onboarding deferred — см. novu-local.md
```

| Проверка | Команда |
|----------|---------|
| Postgres | `pg_isready -h localhost -U postgres` |
| Redis | `redis-cli ping` |
| RabbitMQ | `curl -s -u guest:guest http://localhost:15672/api/overview` |
| Keto | `curl -s http://localhost:4466/health/ready` |
| Auction API | `curl -s http://localhost:3020/v1/health-check` *(Novu)* / `curl -s http://localhost:3003/health` |

**Не коммитить:** `.vitepress/cache/`, локальные артефакты `content/` вне пакета `@tavrida/content`.

---

## ⏱️ Cron / batch jobs (Swarm & manual)

| Job | Endpoint | Интервал | Dev Swarm | Local manual |
|-----|----------|----------|-----------|--------------|
| **Subscription renew** | `POST {PLAN_CONFIG_URL}/internal/v1/subscription/renew/run` | hourly | ✅ `plan-config-renew` в `stack-platform.dev.yml` | `curl -X POST http://localhost:3002/internal/v1/subscription/renew/run` |
| **Auction close** | `POST {AUCTION_URL}/internal/v1/auctions/close/run` | hourly (рекомендуется) | ⏳ добавить `auction-close` sidecar по аналогии | `curl -X POST http://localhost:3003/internal/v1/auctions/close/run` |

Оба endpoint **идемпотентны** на уровне бизнес-логики (повторный close уже закрытого лота — no-op).

При включении `INTERNAL_SERVICE_TOKEN` на internal API — добавить `Authorization: Bearer …` в curl/Swarm command ([PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md)).

---

## 📚 Документация (docs-first hygiene)

### После изменения поведения

1. Spec / README сервиса (если меняется API или домен).
2. [event-catalog.md](../03-architecture/event-catalog.md) — новые/изменённые RMQ events.
3. [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) — новые env.
4. [AGENT-DOCS-INDEX.md](../00-meta/AGENT-DOCS-INDEX.md) — колонка «Статус / заметка» по теме.
5. [WORK-PLAN-NEXT.md](../00-meta/WORK-PLAN-NEXT.md) — чеклисты дня / DoD недели.
6. `AGENT-TODO.todo` — `✔` + `@done(YY-MM-DD)` → Archive.

### Proposal / discussion-only

Документы вроде [tariff-seller-buyer-proposal.md](../01-goal/tariff-seller-buyer-proposal.md) **не** каскадят в PLATFORM-REGISTRY до командного консенсуса.

### Периодическая сверка

- [DOCS-ROADMAP.md](../00-meta/DOCS-ROADMAP.md) — % parity, устаревшие «ghost» планы.
- [PROJECT-CONTEXT.md](../00-meta/PROJECT-CONTEXT.md) — при новом ADR или смене фазы.
- Порты / имена сервисов — [local-dev.md](../04-deployment/local-dev.md), [AGENTS.md](../../AGENTS.md).

---

## 💻 Код и monorepo

| Действие | Команда / правило |
|----------|-------------------|
| Установка зависимостей | `pnpm install` (корень) |
| Линт | `pnpm lint` |
| Сборка gate | `pnpm build` или `pnpm exec turbo run build --filter=…` |
| Тесты сервиса | `pnpm exec turbo run test --filter=@tavrida/auction` |
| Один `PORT=3000` в `.env.local` | **не задавать** глобальный `PORT` — только `*_PORT` ([local-dev.md](../04-deployment/local-dev.md)) |

**Перед push:** убедиться, что в diff нет cache VitePress, `.env.local`, бинарников `content/periods/*.jpg` без явного intent.

---

## 🚀 Dev Swarm (VPS)

См. [docker/swarm/README.dev.md](../../docker/swarm/README.dev.md).

| Действие | Когда |
|----------|-------|
| `sync-secrets-dev.sh` | После смены секретов в `dev.secrets.env` |
| `deploy-dev.sh` | После merge в `master` (или manual workflow) |
| Проверка health | `https://api.${DEV_DOMAIN}/health` |

---

## 📬 Отложенное (не блокирует hygiene, но в backlog)

| Тема | Статус |
|------|--------|
| Novu CE onboarding (Dashboard, API key, `tag-content`) | deferred — [novu-local.md](../04-deployment/novu-local.md) |
| Swarm `auction-close` hourly sidecar | ⏳ AGENT-TODO |
| `subscription.activated` / `expired` из plan-config в RMQ | ⏳ WORK-PLAN хвост |
| Digest CRON real delivery (subscriptions) | после Novu |

---

## ✅ Чеклист «сессия в порядке»

- [ ] Прочитан `AGENT-TODO` + релевантная строка AGENT-DOCS-INDEX
- [ ] Локальная infra поднята (или осознанно mock-only)
- [ ] Изменения отражены в docs (если менялось поведение)
- [ ] `pnpm build` / `test` для затронутых пакетов
- [ ] Нет мусора в git status (cache, secrets, случайные бинарники)
- [ ] WORK-PLAN / TODO обновлены при закрытии дня

---

## 🔗 Связанные разделы

- [local-dev.md](../04-deployment/local-dev.md)
- [swarm-stacks.md](../04-deployment/swarm-stacks.md)
- [security-ops.md](../09-security/security-ops.md)
- [docs-guidelines.md](./docs-guidelines.md)
- [WORK-PLAN-NEXT.md](../00-meta/WORK-PLAN-NEXT.md)
- [AGENT-TODO.todo](../../AGENT-TODO.todo)

---

**Автор:** команда разработки · **Версия:** 0.1-draft

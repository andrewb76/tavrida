# 🧭 PROJECT-CONTEXT — bootstrap для сессии

> **Обновлять** при принятии ADR, смене фазы, новых ключевых docs.  
> **Не дублировать** specs — только указатели и решения.

## Проект

| | |
|---|---|
| **Имя** | Tavrida Lot |
| **Repo** | `max-alice` |
| **Суть** | **Клуб** (инвайт-only): аукционы + форум + маркет услуг (Крым), рейтинг/карма/referral, Free/Basic/Pro |
| **Фаза** | Docs v0.2 ✅ · UX + Frontend spec ✅ · **Frontend scaffold** (Tailwind v4, `@tavrida/ui`) · BFF — docs |
| **Доки (git)** | [docs/README.md](../README.md) |
| **Доки (web)** | [https://andrewb76.github.io/tavrida/](https://andrewb76.github.io/tavrida/) |

## Стек

NestJS · Vue · PostgreSQL (schema per service) · Redis · RabbitMQ · MinIO · Docker Swarm · Traefik · Logto · **Ory Keto** · Novu Cloud Free · Grafana · Sentry · pnpm/turbo monorepo

## Принятые ADR

| # | Решение |
|---|---------|
| 001 | PostgreSQL **schema per service**, одна БД `tavrida_lot` |
| 002 | **BFF**: REST `/api/v1` + WebSocket `/ws/v1` |
| 003 | **scalar-config** (скаляр) + **plan-config** (лимиты per tariff) — [ADR-003](../03-architecture/adr/003-settings-vs-financial-policy.md), [ADR-017](../03-architecture/adr/017-plan-config-scalar-config-rename.md) |
| 004 | **Novu Cloud Free** + `notifications` adapter |
| 005 | **Forum entities:** `topic` + `comment`; `post` deprecated — [ADR-005](../03-architecture/adr/005-forum-terminology.md) |
| 006 | **Renames:** `deal-feedback`, `subscriptions` — [ADR-006](../03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md) |
| 007 | **Expert** scoped to category tree — [ADR-007](../03-architecture/adr/007-category-scoped-expert.md) |
| 011 | **Исходящие webhooks** — [ADR-011](../03-architecture/adr/011-centralized-outbound-webhooks.md) |
| 012 | **Клуб / инвайт** — member = Logto; referral graph — [ADR-012](../03-architecture/adr/012-club-invite-via-logto.md) |
| 013 | **referral-rewards** — денежные бонусы (rules scalar-config + plan-config) — [ADR-013](../03-architecture/adr/013-referral-rewards-service.md) |
| 017 | **Rename** settings → scalar-config, financial-policy → plan-config — [ADR-017](../03-architecture/adr/017-plan-config-scalar-config-rename.md) |
| 008–010 | OpenSearch, E2EE chat, JWT Traefik — **proposed** |

## Ключевые docs (читать первым)

| Задача | Файл |
|--------|------|
| **Навигация по теме (AI)** | [AGENT-DOCS-INDEX.md](./AGENT-DOCS-INDEX.md) |
| **Roadmap docs → идеал** | [DOCS-ROADMAP.md](./DOCS-ROADMAP.md) |
| Продукт для людей | [platform-for-users.md](../01-goal/platform-for-users.md) |
| Клуб и инвайты | [club-access.md](../01-goal/club-access.md) |
| Карма / рейтинг | [karma-and-rating.md](../01-goal/karma-and-rating.md) |
| Сценарии BDD/TDD | [platform-scenarios.md](../01-goal/platform-scenarios.md) → [frequent / occasional / rare](../01-goal/scenarios/frequent.md) |
| Роли | [roles.md](../01-goal/roles.md) |
| Marketplace | [marketplace/README.md](../05-microservices/marketplace/README.md) |
| Все переменные (бизнес) | [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) |
| Все env / секреты | [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) |
| Новый сервис | [MICROSERVICE-SPEC.md](../05-microservices/MICROSERVICE-SPEC.md) |
| События | [event-catalog.md](../03-architecture/event-catalog.md) · [messaging.md](../03-architecture/messaging.md) |
| Keto | [keto-schema.md](../09-security/keto-schema.md) |
| Модераторы (mapping) | [moderator-mapping.md](../09-security/moderator-mapping.md) |
| Именование | [naming.md](../13-maintenance/naming.md) |
| API conventions | [06-api/README.md](../06-api/README.md) |
| Деплой | [04-deployment](../04-deployment/README.md) · [local-dev](../04-deployment/local-dev.md) |
| Observability | [07-observability](../07-observability/README.md) · [SLO](../07-observability/slo.md) |
| Security ops | [security-ops](../09-security/security-ops.md) |
| UX / wireframes | [11-ux-ui/README.md](../11-ux-ui/README.md) |
| Frontend SPA | [14-frontend/README.md](../14-frontend/README.md) · [stack-decisions](../14-frontend/stack-decisions.md) |

## Сервисы

**Код (каркас):** `billing`, `plan-config`, `scalar-config`, `auction`, `subscriptions` (ex `auction-subscriptions`), `forum`, `user-profile`, `bff`  
**Только docs:** `rating`, `notifications`, `webhooks`  
**В коде (scaffold+):** `bff`, `forum`, `user-profile`, `marketplace`, `deal-feedback`, `periods`, …  
**Порты (draft):** billing 3001, plan-config 3002, scalar-config 3008, notifications 3010, webhooks 3011, bff 3000

## Роли (кратко)

Guest (landing only) → User (**member**, invite redeemed) · Moderator (+ forum **и auction** mod, уточняется) · **Expert** (экспертиза лотов, admin) · Admin  
Тариф ≠ роль: Free/Basic/Pro → plan-config  
Контекст: seller/buyer/bidder per auction; provider/customer per marketplace order

## Открыто / не фиксировать

- Цены подписок Basic/Pro — **TBD** (обсуждались 99/399 ₽)
- admin-ui — не описан
- marketplace **комиссия / юридика** — TBD (отдельный doc)
- Moderator auction powers — draft в keto-schema
- ~~Moderator forum model~~ → [moderator-mapping.md](../09-security/moderator-mapping.md) ✅

## Правила docs

- Русский, emoji в заголовках, имя **Tavrida Lot**
- Новая переменная → PLATFORM-REGISTRY + README сервиса
- UX/права → platform-for-users + roles

## Roadmap docs

**Единый план:** [DOCS-ROADMAP.md](./DOCS-ROADMAP.md) (~80 % spec-ready · impl ⏳).

---

**v0.2** · последнее обновление: 2026-07-12

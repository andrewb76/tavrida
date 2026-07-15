# 🤖 AGENT-DOCS-INDEX — навигация по документации для AI

> **Назначение:** тематический индекс. Читать **в начале задачи** вместо полного обхода `docs/`.  
> **Обновлять:** в конце задачи, если добавились/изменились docs или статус реализации.  
> **Правила ведения:** [docs-guidelines.md](../13-maintenance/docs-guidelines.md) · **Bootstrap:** [PROJECT-CONTEXT.md](./PROJECT-CONTEXT.md)

**Последнее обновление индекса:** 2026-07-16 (invites quota via plan-config)

---

## Как пользоваться

1. Определи **тему задачи** (таблица ниже).
2. Прочитай только файлы из колонки «Читать» — в указанном порядке.
3. При необходимости углубись по ссылкам «Дополнительно».
4. По завершении: обнови docs → обнови строку темы в этом файле (статус, дата, новые пути).

---

## Тематический указатель

| Тема | Когда читать | Читать (обязательно) | Дополнительно | Код / статус |
|------|--------------|----------------------|---------------|--------------|
| **Bootstrap / новая сессия** | Любая незнакомая задача | [PROJECT-CONTEXT.md](./PROJECT-CONTEXT.md) | [docs/README.md](../README.md) | — |
| **Инвайты / клуб / referral** | BFF invites, `/join`, Logto OTT, claim | [club-access.md](../01-goal/club-access.md) → [ADR-012](../03-architecture/adr/012-club-invite-via-logto.md) → [06-api/invites-api.md](../06-api/invites-api.md) → [invites-api.md](../05-microservices/bff/invites-api.md) → [user-profile/README.md](../05-microservices/user-profile/README.md) | [karma-and-rating.md](../01-goal/karma-and-rating.md) · [logto-setup.md](../14-frontend/logto-setup.md) · [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) · [plan-config/README.md](../05-microservices/plan-config/README.md) | create/list/resolve/claim ✅ · OpenAPI ✅ · quota `club.member.invite.monthlyMax` ✅ · E2E later |
| **BFF (общее)** | Новые REST/WS routes, proxy, агрегация | [bff/README.md](../05-microservices/bff/README.md) → [ADR-002](../03-architecture/adr/002-bff-rest-wss.md) → [06-api/README.md](../06-api/README.md) | [event-catalog.md](../03-architecture/event-catalog.md) | `services/bff` · admin settings API |
| **Scalar config** | Scalar registry, club.* | [registry-keys.md](../13-maintenance/registry-keys.md) → [scalar-config/README.md](../05-microservices/scalar-config/README.md) → [ADR-003](../03-architecture/adr/003-settings-vs-financial-policy.md) → [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) | [ADR-017](../03-architecture/adr/017-plan-config-scalar-config-rename.md) · [invites-api.md](../05-microservices/bff/invites-api.md) | `services/scalar-config` · BFF `ClubSettingsReader` · admin UI `/admin/settings` |
| **Auth / JWT / Logto** | Guards, OIDC, M2M, Keto | [09-security/README.md](../09-security/README.md) → [keto-schema.md](../09-security/keto-schema.md) → [bootstrap-admin.md](../09-security/bootstrap-admin.md) → [logto-setup.md](../14-frontend/logto-setup.md) | [ADR-010](../03-architecture/adr/010-jwt-validation-traefik.md) · [moderator-mapping.md](../09-security/moderator-mapping.md) · [impersonation.md](../09-security/impersonation.md) · [ADR-018](../03-architecture/adr/018-admin-impersonation.md) | `GET /me/roles` · `/admin` UI · `X-Act-As` · bff guards |
| **Frontend SPA** | Vue routes, API layer, UI | [14-frontend/README.md](../14-frontend/README.md) → [stack-decisions.md](../14-frontend/stack-decisions.md) | [screen-tree.md](../11-ux-ui/screen-tree.md) · [design-tokens.md](../11-ux-ui/design-tokens.md) | `UiIcon` = Iconify+Lucide · `apps/frontend` |
| **User profile** | Профиль, notes, internal API | [user-profile/README.md](../05-microservices/user-profile/README.md) → [MICROSERVICE-SPEC.md](../05-microservices/MICROSERVICE-SPEC.md) | [10-data/README.md](../10-data/README.md) · ADR-001 · [logto-webhooks.md](../14-frontend/logto-webhooks.md) | `POST /me/identity` · forum enrich Logto backfill |
| **Аукционы / ставки** | auction domain | [auction/README.md](../05-microservices/auction/README.md) | [catalog-listing.md](../05-microservices/auction/requirements/catalog-listing.md) · [financial-features.md](../05-microservices/auction/requirements/financial-features.md) · [wireframes/auctions.md](../11-ux-ui/wireframes/auctions.md) · S-002 | `services/auction` · scaffold |
| **Биллинг / кошелёк** | balance, deposit, charges | [billing/README.md](../05-microservices/billing/README.md) | [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) | `services/billing` v1 · BFF `/api/v1/wallets` · `/wallet` UI |
| **Тарифы / лимиты** | Free/Basic/Pro, plan variables, sync | [registry-keys.md](../13-maintenance/registry-keys.md) → [ADR-017](../03-architecture/adr/017-plan-config-scalar-config-rename.md) → [ADR-016](../03-architecture/adr/016-financial-policy-parameter-registration.md) → [plan-config/README.md](../05-microservices/plan-config/README.md) → [ADR-003](../03-architecture/adr/003-settings-vs-financial-policy.md) | [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) | `services/plan-config` · BFF `POST /plans/activate` + billing charge ✅ · CRON renew ⏳ · `/admin/plan-config` |
| **Vanga / прогноз дохода** | Admin симулятор | [glossary.md](../05-microservices/vanga/glossary.md) → [overview.md](../05-microservices/vanga/overview.md) → [topic-index.md](../05-microservices/vanga/topic-index.md) → [IMPLEMENTATION-PLAN.md](../05-microservices/vanga/IMPLEMENTATION-PLAN.md) | [topics/](../05-microservices/vanga/topics/) · [ADR-015](../03-architecture/adr/015-monetization-engine.md) · `packages/monetization-engine` · `config/vanga.defaults.yaml` | BFF + `/admin/vanga` UI ✅ · checkpoint 0 |
| **Форум** | topics, comments, +/- → karma | [forum/README.md](../05-microservices/forum/README.md) → [ADR-005](../03-architecture/adr/005-forum-terminology.md) | [forum/requirements/README.md](../05-microservices/forum/requirements/README.md) · [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) · [tags.md](../05-microservices/forum/tags.md) | Formal Tag/ContentTag · `GET /forum/tags` · subscribe chip · votes/reactions/promote |
| **Рейтинг / карма** | karma, log popup | [karma-and-rating.md](../01-goal/karma-and-rating.md) → [rating/README.md](../05-microservices/rating/README.md) | [profile-wallet.md](../11-ux-ui/wireframes/profile-wallet.md) | forum votes + deal-feedback → reputation log |
| **Реферальные выплаты** | referral-rewards, модели CPA/CPS, Vanga реферал | [referral-rewards/requirements/analysis.md](../05-microservices/referral-rewards/requirements/analysis.md) → [referral-models-catalog.md](../05-microservices/referral-rewards/requirements/referral-models-catalog.md) → [referral-rewards/README.md](../05-microservices/referral-rewards/README.md) | [referral-forecast.md](../05-microservices/vanga/topics/referral-forecast.md) · [charge-categories.md](../05-microservices/referral-rewards/requirements/charge-categories.md) | docs · engine v0 |
| **Marketplace** | услуги, заказы | [marketplace/README.md](../05-microservices/marketplace/README.md) | [marketplace/requirements/README.md](../05-microservices/marketplace/requirements/README.md) · [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) · [media/README.md](../05-microservices/media/README.md) | :3011 · portfolio media · orders UI · RMQ `order_completed` |
| **Deal feedback** | отзывы о сделках | [deal_feedback/README.md](../05-microservices/deal_feedback/README.md) → [ADR-006](../03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md) | [karma-and-rating.md](../01-goal/karma-and-rating.md) · [messaging.md](../03-architecture/messaging.md) | `services/deal-feedback` :3006 · pending + submit → `DEAL_FEEDBACK` |
| **Подписки (events)** | subscribe to lot/topic/tag | [subscriptions/README.md](../05-microservices/subscriptions/README.md) → [ADR-006](../03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md) | [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) · [notifications/README.md](../05-microservices/notifications/README.md) · [forum/tags.md](../05-microservices/forum/tags.md) · [event-catalog.md](../03-architecture/event-catalog.md) | CRUD + match · RMQ · titles · `/forum/tags/:slug` · FE `useSubscriptionsStore` (chip dedupe) |
| **Notifications** | Novu adapter, trigger, audit | [notifications/README.md](../05-microservices/notifications/README.md) → [ADR-004](../03-architecture/adr/004-notifications-adapter.md) | [notifications-analysis.md](../03-architecture/notifications-analysis.md) · [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) | `:3010` · trigger + mock/Novu · `tag-content` |
| **Периоды (история)** | иерархический справочник, timeline widget | [periods/README.md](../05-microservices/periods/README.md) | [MICROSERVICE-SPEC.md](../05-microservices/MICROSERVICE-SPEC.md) · platform-for-users | :3014 · admin UI · Crimea seed · d3 widget later |
| **Webhooks (исходящие)** | outbound integrations | [webhooks/README.md](../05-microservices/webhooks/README.md) → [ADR-011](../03-architecture/adr/011-centralized-outbound-webhooks.md) | [event-catalog.md](../03-architecture/event-catalog.md) | docs only |
| **События / messaging** | RabbitMQ, event names | [event-catalog.md](../03-architecture/event-catalog.md) → [messaging.md](../03-architecture/messaging.md) | [03-architecture/README.md](../03-architecture/README.md) | — |
| **API conventions** | errors, pagination, idempotency | [06-api/README.md](../06-api/README.md) | [invites-api.md](../06-api/invites-api.md) · [vanga-admin-api.md](../06-api/vanga-admin-api.md) · [bff/README.md](../05-microservices/bff/README.md) | fragments ✅ · full openapi.yaml TODO |
| **Данные / schema** | entities, ownership | [10-data/README.md](../10-data/README.md) → [ADR-001](../03-architecture/adr/001-database-schema-per-service.md) | [naming.md](../13-maintenance/naming.md) · [registry-keys.md](../13-maintenance/registry-keys.md) | — |
| **Локальная разработка** | docker, env, ports | [local-dev.md](../04-deployment/local-dev.md) → [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) | [bootstrap-admin.md](../09-security/bootstrap-admin.md) · [dev-tools.md](../02-infrastructure/dev-tools.md) · `docker/compose/` | infra includes Keto · `pnpm keto:up` · schema `keto` |
| **Деплой / CI** | Swarm, migrations, GH Actions | [04-deployment/README.md](../04-deployment/README.md) → [github-actions.md](../04-deployment/github-actions.md) | [swarm-stacks.md](../04-deployment/swarm-stacks.md) · [docker/swarm/README.dev.md](../../docker/swarm/README.dev.md) | Environment `dev`: deploy + sync secrets |
| **Observability** | logs, metrics, SLO | [07-observability/README.md](../07-observability/README.md) | [slo.md](../07-observability/slo.md) · [sentry-setup.md](../07-observability/sentry-setup.md) | — |
| **UX / wireframes** | экраны, IA | [11-ux-ui/README.md](../11-ux-ui/README.md) → [screen-tree.md](../11-ux-ui/screen-tree.md) | [wireframes/](../11-ux-ui/wireframes/README.md) | — |
| **Продукт (для людей)** | PM, onboarding, copy | [platform-for-users.md](../01-goal/platform-for-users.md) | [platform-scenarios.md](../01-goal/platform-scenarios.md) | — |
| **Роли и права** | RBAC, тарифы | [roles.md](../01-goal/roles.md) | [keto-schema.md](../09-security/keto-schema.md) | — |
| **Новый микросервис** | scaffold + docs | [MICROSERVICE-SPEC.md](../05-microservices/MICROSERVICE-SPEC.md) → [naming.md](../13-maintenance/naming.md) | [DOCS-ROADMAP.md](./DOCS-ROADMAP.md) | — |
| **Документация (meta)** | структура, roadmap, guidelines | [docs-guidelines.md](../13-maintenance/docs-guidelines.md) → [DOCS-ROADMAP.md](./DOCS-ROADMAP.md) | [docs/README.md](../README.md) | — |
| **Очередь задач (AI)** | backlog, «сделай потом» | [AGENT-TODO.todo](../../AGENT-TODO.todo) (Todo+ sidebar) | `.cursor/rules/agent-tasks.mdc` | — |
| **Sprint / work plan** | ближайшие дни, docs↔код audit | [WORK-PLAN-NEXT.md](./WORK-PLAN-NEXT.md) | [DOCS-ROADMAP.md](./DOCS-ROADMAP.md) · [PROJECT-CONTEXT.md](./PROJECT-CONTEXT.md) | living · 2026-07-16 |

---

## Быстрые пути по директориям

| Папка | Содержание |
|-------|------------|
| `docs/00-meta/` | Bootstrap, roadmap, **этот индекс** |
| `docs/01-goal/` | Продукт, сценарии, клуб, роли |
| `docs/02-infrastructure/` | Env, секреты, SaaS matrix |
| `docs/03-architecture/` | ADR, events, messaging |
| `docs/04-deployment/` | Local dev, Swarm, CI |
| `docs/05-microservices/` | Specs сервисов |
| `docs/06-api/` | REST/WS conventions |
| `docs/09-security/` | Auth, Keto, security ops |
| `docs/11-ux-ui/` | Wireframes, design system |
| `docs/14-frontend/` | Vue SPA spec |

---

## Чеклист обновления (конец задачи)

- [ ] Продуктовый слой обновлён (если менялась фича): `01-goal/`
- [ ] Технический spec обновлён: `05-microservices/`, `06-api/`, ADR при необходимости
- [ ] `PLATFORM-SECRETS` / `local-dev` — если новые env vars
- [ ] Строка темы в таблице выше: статус, дата, новые пути
- [ ] `PROJECT-CONTEXT.md` — только если сменилась фаза или ключевое ADR

---

**Версия индекса:** 0.1

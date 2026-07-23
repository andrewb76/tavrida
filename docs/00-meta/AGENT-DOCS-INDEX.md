# 🤖 AGENT-DOCS-INDEX — навигация по документации для AI

> **Назначение:** тематический индекс. Читать **в начале задачи** вместо полного обхода `docs/`.  
> **Обновлять:** в конце задачи, если добавились/изменились docs или статус реализации.  
> **Правила ведения:** [docs-guidelines.md](../13-maintenance/docs-guidelines.md) · **Bootstrap:** [PROJECT-CONTEXT.md](./PROJECT-CONTEXT.md)

**Последнее обновление индекса:** 2026-07-23 (chat mobile Telegram-like UI)

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
| **Инвайты / клуб / referral** | BFF invites, `/join`, Logto OTT, claim | [club-access.md](../01-goal/club-access.md) → [ADR-012](../03-architecture/adr/012-club-invite-via-logto.md) → [06-api/invites-api.md](../06-api/invites-api.md) → [invites-api.md](../05-microservices/bff/invites-api.md) → [user-profile/README.md](../05-microservices/user-profile/README.md) | [karma-and-rating.md](../01-goal/karma-and-rating.md) · [event-catalog.md](../03-architecture/event-catalog.md) · [plan-config/README.md](../05-microservices/plan-config/README.md) | create/resolve/claim ✅ · quota ✅ · `invitation.redeemed` RMQ publish ✅ · consumers later |
| **BFF (общее)** | Новые REST/WS routes, proxy, агрегация | [bff/README.md](../05-microservices/bff/README.md) → [ADR-002](../03-architecture/adr/002-bff-rest-wss.md) → [06-api/README.md](../06-api/README.md) | [event-catalog.md](../03-architecture/event-catalog.md) | REST v1 · admin APIs · WS planned |
| **Scalar config** | Scalar registry, club.* | [registry-keys.md](../13-maintenance/registry-keys.md) → [scalar-config/README.md](../05-microservices/scalar-config/README.md) → [ADR-003](../03-architecture/adr/003-settings-vs-financial-policy.md) → [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) | [ADR-017](../03-architecture/adr/017-plan-config-scalar-config-rename.md) · [ADR-020](../03-architecture/adr/020-three-config-registries.md) · [invites-api.md](../05-microservices/bff/invites-api.md) | DB registry/admin v1 · `/internal/v1/scalar-variables` · Redis planned · **user-prefs post-MVP** |
| **Auth / JWT / Logto** | Guards, OIDC, M2M, Keto | [09-security/README.md](../09-security/README.md) → [keto-schema.md](../09-security/keto-schema.md) → [bootstrap-admin.md](../09-security/bootstrap-admin.md) → [logto-setup.md](../14-frontend/logto-setup.md) | [security-ops.md](../09-security/security-ops.md) · [ADR-010](../03-architecture/adr/010-jwt-validation-traefik.md) · [impersonation.md](../09-security/impersonation.md) · [ADR-018](../03-architecture/adr/018-admin-impersonation.md) | JWT fail-closed · Swarm Logto OSS · Account Center link `/profile/me` · `X-Act-As` |
| **Frontend SPA** | Vue routes, API layer, UI | [14-frontend/README.md](../14-frontend/README.md) → [stack-decisions.md](../14-frontend/stack-decisions.md) → [cookie-consent.md](../14-frontend/cookie-consent.md) | [screen-tree.md](../11-ux-ui/screen-tree.md) · [design-tokens.md](../11-ux-ui/design-tokens.md) · [brandbook.md](../11-ux-ui/brandbook.md) · [legal-documents.md](../01-goal/legal-documents.md) L-07 | identity-scoped caches · landing · cookie banner L-07 ✅ 26-07-23 |
| **User profile** | Профиль, notes, username, hard lock, internal API | [user-profile/README.md](../05-microservices/user-profile/README.md) → [hard-lock.md](../05-microservices/user-profile/hard-lock.md) → [MICROSERVICE-SPEC.md](../05-microservices/MICROSERVICE-SPEC.md) | [username.md](../05-microservices/user-profile/requirements/username.md) · [10-data/README.md](../10-data/README.md) · ADR-001 · [logto-webhooks.md](../14-frontend/logto-webhooks.md) | `POST /me/identity` · private notes · forum enrich · username UNIQUE + search/@mention · **hard lock** ✅ 26-07-23 |
| **Аукционы / ставки** | auction domain | [auction/README.md](../05-microservices/auction/README.md) → [dutch-bidding.md](../05-microservices/auction/requirements/dutch-bidding.md) | [catalog-listing.md](../05-microservices/auction/requirements/catalog-listing.md) · [financial-features.md](../05-microservices/auction/requirements/financial-features.md) · [wireframes/auctions.md](../11-ux-ui/wireframes/auctions.md) · [event-catalog.md](../03-architecture/event-catalog.md) | English/Dutch · transactional bid/close · outbox · strict create policy + idempotent paid options |
| **Биллинг / кошелёк** | balance, deposit, charges | [billing/README.md](../05-microservices/billing/README.md) | [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) | `services/billing` v1 · BFF `/api/v1/wallets` · `/wallet` UI |
| **Тарифы / лимиты** | Free/Basic/Pro, plan variables, sync | [registry-keys.md](../13-maintenance/registry-keys.md) → [ADR-017](../03-architecture/adr/017-plan-config-scalar-config-rename.md) → [ADR-016](../03-architecture/adr/016-financial-policy-parameter-registration.md) → [plan-config/README.md](../05-microservices/plan-config/README.md) → [ADR-003](../03-architecture/adr/003-settings-vs-financial-policy.md) | [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) · [ADR-020](../03-architecture/adr/020-three-config-registries.md) · **[proposal Seller/Buyer](../01-goal/tariff-seller-buyer-proposal.md)** · [swarm-stacks.md](../04-deployment/swarm-stacks.md) | fail-closed writes · null/disabled deny · expired plan→Free · activate + renew ✅ · **три реестра (user-prefs) — post-MVP** |
| **Vanga / прогноз дохода** | Admin симулятор | [glossary.md](../05-microservices/vanga/glossary.md) → [overview.md](../05-microservices/vanga/overview.md) → [topic-index.md](../05-microservices/vanga/topic-index.md) → [IMPLEMENTATION-PLAN.md](../05-microservices/vanga/IMPLEMENTATION-PLAN.md) | [topics/](../05-microservices/vanga/topics/) · [ADR-015](../03-architecture/adr/015-monetization-engine.md) · `packages/monetization-engine` · `config/vanga.defaults.yaml` | BFF + `/admin/vanga` UI ✅ · checkpoint 0 |
| **Форум** | topics, comments, drafts, staff mod, category ACL, +/- → karma | [forum/README.md](../05-microservices/forum/README.md) → [category-acl.md](../05-microservices/forum/category-acl.md) → [drafts.md](../05-microservices/forum/drafts.md) → [ADR-005](../03-architecture/adr/005-forum-terminology.md) | [forum/requirements/README.md](../05-microservices/forum/requirements/README.md) · [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) · [tags.md](../05-microservices/forum/tags.md) · [chat/analysis](../05-microservices/chat/requirements/analysis.md) (TOPIC) | Formal tags · drafts · staff mod · **access groups ACL (OR)** ✅ 26-07-23 |
| **Chat (ЛС / группы / side chat)** | DIRECT, GROUP, TOPIC, self-DM | [chat/requirements/analysis.md](../05-microservices/chat/requirements/analysis.md) → [chat/README.md](../05-microservices/chat/README.md) | [chat-api.md](../06-api/chat-api.md) · [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) · [ADR-009](../03-architecture/adr/009-deal-messaging-e2ee.md) · [username.md](../05-microservices/user-profile/requirements/username.md) · [media/README.md](../05-microservices/media/README.md) | wave A–C ✅ · mobile TG UI · port 3016 |
| **Рейтинг / карма** | karma, log popup | [karma-and-rating.md](../01-goal/karma-and-rating.md) → [rating/README.md](../05-microservices/rating/README.md) | [profile-wallet.md](../11-ux-ui/wireframes/profile-wallet.md) | forum votes + deal-feedback → reputation log |
| **Реферальные выплаты** | referral-rewards, модели CPA/CPS, Vanga реферал | [referral-rewards/requirements/analysis.md](../05-microservices/referral-rewards/requirements/analysis.md) → [referral-models-catalog.md](../05-microservices/referral-rewards/requirements/referral-models-catalog.md) → [referral-rewards/README.md](../05-microservices/referral-rewards/README.md) | [referral-forecast.md](../05-microservices/vanga/topics/referral-forecast.md) · [charge-categories.md](../05-microservices/referral-rewards/requirements/charge-categories.md) | docs · engine v0 |
| **Marketplace** | услуги, заказы | [marketplace/README.md](../05-microservices/marketplace/README.md) | [marketplace/requirements/README.md](../05-microservices/marketplace/requirements/README.md) · [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) · [media/README.md](../05-microservices/media/README.md) | :3011 · portfolio media · orders UI · RMQ `order_completed` |
| **Deal feedback** | отзывы о сделках | [deal_feedback/README.md](../05-microservices/deal_feedback/README.md) → [ADR-006](../03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md) | [karma-and-rating.md](../01-goal/karma-and-rating.md) · [messaging.md](../03-architecture/messaging.md) | `services/deal-feedback` :3006 · pending + submit → `DEAL_FEEDBACK` |
| **Подписки (events)** | subscribe to lot/topic/tag | [subscriptions/README.md](../05-microservices/subscriptions/README.md) → [ADR-006](../03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md) | [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) · [notifications/README.md](../05-microservices/notifications/README.md) · [forum/tags.md](../05-microservices/forum/tags.md) · [event-catalog.md](../03-architecture/event-catalog.md) | CRUD + match · RMQ · Logto opaque `userId` · titles · `/forum/tags/:slug` · FE `useSubscriptionsStore` |
| **Notifications** | Novu adapter, self-host | [notifications/README.md](../05-microservices/notifications/README.md) → [ADR-019](../03-architecture/adr/019-novu-self-host.md) → [novu-local.md](../04-deployment/novu-local.md) | [ADR-004](../03-architecture/adr/004-notifications-adapter.md) · [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) | `:3010` · compose ✅ · onboarding **deferred** · mock |
| **Периоды (история)** | иерархический справочник, timeline widget | [periods/README.md](../05-microservices/periods/README.md) | [MICROSERVICE-SPEC.md](../05-microservices/MICROSERVICE-SPEC.md) · platform-for-users | :3014 · admin UI · Crimea seed · d3 widget later |
| **Webhooks (исходящие)** | outbound integrations | [webhooks/README.md](../05-microservices/webhooks/README.md) → [ADR-011](../03-architecture/adr/011-centralized-outbound-webhooks.md) | [event-catalog.md](../03-architecture/event-catalog.md) | docs only |
| **События / messaging** | RabbitMQ, event names | [event-catalog.md](../03-architecture/event-catalog.md) → [messaging.md](../03-architecture/messaging.md) | [03-architecture/README.md](../03-architecture/README.md) | transactional outbox: auction, marketplace, forum, user-profile · confirms + retry/DLQ |
| **API conventions** | errors, pagination, idempotency | [06-api/README.md](../06-api/README.md) | [invites-api.md](../06-api/invites-api.md) · [vanga-admin-api.md](../06-api/vanga-admin-api.md) · [bff/README.md](../05-microservices/bff/README.md) | canonical routes audited 2026-07-17 · full openapi.yaml TODO |
| **Тестирование** | Unit/integration/contract/E2E, CI gates | [08-testing/README.md](../08-testing/README.md) → [IMPLEMENTATION-PLAN.md](../08-testing/IMPLEMENTATION-PLAN.md) | [platform-scenarios.md](../01-goal/platform-scenarios.md) · [github-actions.md](../04-deployment/github-actions.md) · [messaging.md](../03-architecture/messaging.md) | 201 unit/mock assertions ✅ · T0–T6 rollout planned |
| **Данные / schema** | entities, ownership | [10-data/README.md](../10-data/README.md) → [ADR-001](../03-architecture/adr/001-database-schema-per-service.md) → [migrations.md](../04-deployment/migrations.md) | [naming.md](../13-maintenance/naming.md) · [registry-keys.md](../13-maintenance/registry-keys.md) | 13 schemas (+ `chat` planned) · `DATABASE_URL` · versioned migrations |
| **Локальная разработка** | docker, env, ports | [local-dev.md](../04-deployment/local-dev.md) → [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) | [bootstrap-admin.md](../09-security/bootstrap-admin.md) · [dev-tools.md](../02-infrastructure/dev-tools.md) · `docker/compose/` | infra + Keto · `pnpm novu:up` · Logto optional |
| **Деплой / CI** | Swarm, migrations, GH Actions | [04-deployment/README.md](../04-deployment/README.md) → [dev-evatorg.md](../04-deployment/dev-evatorg.md) → [migrations.md](../04-deployment/migrations.md) → [github-actions.md](../04-deployment/github-actions.md) | [swarm-stacks.md](../04-deployment/swarm-stacks.md) · [ops-hygiene.md](../13-maintenance/ops-hygiene.md) · `docker/swarm/README.dev.md` | `evatorg.su` · CD `dev` · Logto OSS `auth.`/`logto.` |
| **Observability** | logs, metrics, SLO | [07-observability/README.md](../07-observability/README.md) | [slo.md](../07-observability/slo.md) · [sentry-setup.md](../07-observability/sentry-setup.md) | — |
| **UX / wireframes** | экраны, IA, visual direction | [11-ux-ui/README.md](../11-ux-ui/README.md) → [design-system.md](../11-ux-ui/design-system.md) → [screen-tree.md](../11-ux-ui/screen-tree.md) | [wireframes/](../11-ux-ui/wireframes/README.md) · [visual-lab](../11-ux-ui/wireframes/visual-lab/README.md) | light/dark page backgrounds ✅ · W03 direction selection pending |
| **Продукт (для людей)** | PM, onboarding, copy | [platform-for-users.md](../01-goal/platform-for-users.md) | [platform-scenarios.md](../01-goal/platform-scenarios.md) | — |
| **Роли и права** | RBAC, тарифы | [roles.md](../01-goal/roles.md) | [keto-schema.md](../09-security/keto-schema.md) | — |
| **Новый микросервис** | scaffold + docs | [MICROSERVICE-SPEC.md](../05-microservices/MICROSERVICE-SPEC.md) → [naming.md](../13-maintenance/naming.md) | [DOCS-ROADMAP.md](./DOCS-ROADMAP.md) | — |
| **Документация (meta)** | структура, roadmap, guidelines | [docs-guidelines.md](../13-maintenance/docs-guidelines.md) → [DOCS-ROADMAP.md](./DOCS-ROADMAP.md) | [ops-hygiene.md](../13-maintenance/ops-hygiene.md) · [docs/README.md](../README.md) | cron + session checklist |
| **Очередь задач (AI)** | backlog, «сделай потом» | [AGENT-TODO.todo](../../AGENT-TODO.todo) (Todo+ sidebar) | `.cursor/rules/agent-tasks.mdc` | — |
| **Sprint / work plan** | ближайшие дни, docs↔код audit | [WORK-PLAN-NEXT.md](./WORK-PLAN-NEXT.md) | [DOCS-ROADMAP.md](./DOCS-ROADMAP.md) · [PROJECT-CONTEXT.md](./PROJECT-CONTEXT.md) | Dutch MVP ✅ · promote/expert/WS backlog |

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

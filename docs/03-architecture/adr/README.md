# 📋 Architecture Decision Records (ADR)

> Реестр архитектурных решений Tavrida Lot. Новое решение → новый файл `NNN-short-title.md`.

## 📊 Статусы

| Статус | Значение |
|--------|----------|
| proposed | На обсуждении |
| accepted | Принято, действует |
| deprecated | Заменено другим ADR |
| superseded | Ссылка на новый ADR |

## 📄 Реестр

| ADR | Название | Статус | Дата |
|-----|----------|--------|------|
| [001](./001-database-schema-per-service.md) | PostgreSQL: schema per service | accepted | 2026-07-06 |
| [002](./002-bff-rest-wss.md) | BFF: REST + WebSocket | accepted | 2026-07-06 |
| [003](./003-settings-vs-financial-policy.md) | Scalar-config vs Plan-config (legacy title: Settings vs Financial-policy) | accepted | 2026-07-06 |
| [004](./004-notifications-adapter.md) | Notifications: Novu adapter (+ Cloud Free) | superseded → [019](./019-novu-self-host.md) | 2026-07-06 |
| [005](./005-forum-terminology.md) | Forum: topic/comment, deprecate post | accepted | 2026-07-08 |
| [006](./006-service-renames-deal-feedback-subscriptions.md) | deal-feedback, subscriptions renames | accepted | 2026-07-09 |
| [007](./007-category-scoped-expert.md) | Expert scoped to category tree | accepted | 2026-07-09 |
| [008](./008-opensearch-full-text.md) | OpenSearch post-MVP | proposed | 2026-07-09 |
| [009](./009-deal-messaging-e2ee.md) | E2EE deal chat Phase 2+ | proposed | 2026-07-09 |
| [010](./010-jwt-validation-traefik.md) | JWT validation at Traefik edge | proposed | 2026-07-09 |
| [011](./011-centralized-outbound-webhooks.md) | Централизованный сервис исходящих webhooks | accepted | 2026-07-09 |
| [012](./012-club-invite-via-logto.md) | Member = Logto; invite = registration + referral | accepted | 2026-07-09 |
| [013](./013-referral-rewards-service.md) | Денежные реферальные вознаграждения — `referral-rewards` | accepted | 2026-07-10 |
| [014](./014-vanga-revenue-forecast.md) | Vanga: симулятор дохода (admin) | accepted | 2026-07-11 |
| [015](./015-monetization-engine.md) | Monetization engine package | accepted | 2026-07-11 |
| [016](./016-financial-policy-parameter-registration.md) | Plan-config: планы, матрица, register plan variables | accepted | 2026-07-11 |
| [017](./017-plan-config-scalar-config-rename.md) | Rename plan-config / scalar-config, key format | accepted | 2026-07-11 |
| [018](./018-admin-impersonation.md) | Admin impersonation via `X-Act-As` | accepted | 2026-07-16 |
| [019](./019-novu-self-host.md) | Novu self-host (local compose → Swarm) | accepted | 2026-07-16 |
| [020](./020-three-config-registries.md) | Три реестра: scalar · plan · user-prefs (реализация post-MVP) | accepted | 2026-07-22 |

## 📝 Шаблон ADR

```markdown
# ADR-NNN: Название

> **Статус:** accepted · **Дата:** YYYY-MM-DD

## 🎯 Контекст
Какая проблема решается.

## ✅ Решение
Что принято.

## 🔄 Альтернативы
Что рассматривалось.

## 📌 Последствия
Плюсы, минусы, что нужно сделать.
```

---

**Автор:** команда разработки · **Версия:** 0.1

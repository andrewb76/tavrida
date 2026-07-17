# 🏛️ Архитектура Tavrida Lot

> **Статус:** draft v0.2 · **Версия:** 0.2

## 🎯 Обзор

Tavrida Lot — микросервисная платформа (NestJS + Vue) для аукционов, форума и маркета услуг.  
Публичный доступ — **только через BFF** (REST + WebSocket).

## 🗺️ C4 Level 1 — System Context

```mermaid
C4Context
    title System Context — Tavrida Lot

    Person(user, "Пользователь", "Покупатель / продавец")
    Person(admin, "Администратор", "Управление тарифами")

    System(tl, "Tavrida Lot", "Аукционы, форум, услуги")
    System_Ext(logto, "Logto", "Identity Provider")
    System_Ext(keto, "Ory Keto", "RBAC")
    System_Ext(sentry, "Sentry", "Errors")
    System_Ext(grafana, "Grafana Cloud", "Metrics/Logs")

    Rel(user, tl, "Uses", "HTTPS/WSS")
    Rel(admin, tl, "Administers", "HTTPS")
    Rel(tl, logto, "Auth", "OIDC/JWT")
    Rel(tl, keto, "Authorize", "HTTP")
    Rel(tl, sentry, "Reports errors")
    Rel(tl, grafana, "Telemetry")
```

## 🗺️ C4 Level 2 — Containers

```mermaid
flowchart TB
    subgraph client [Client]
        Vue[Vue SPA]
    end

    subgraph edge [Edge]
        Traefik[Traefik v3]
    end

    subgraph platform [Tavrida Lot]
        BFF[BFF\nREST + WSS]
        subgraph core [Core Services]
            billing
            fp[plan-config]
            sc[scalar-config]
        end
        subgraph domain [Domain Services]
            auction
            forum
            rating
            dealFeedback[deal-feedback]
            profile[user-profile]
            marketplace
            periods
            subs[subscriptions]
        end
        subgraph support [Support]
            notif[notifications]
        end
    end

    subgraph infra [Infrastructure]
        PG[(PostgreSQL\nschemas per service)]
        Redis[(Redis)]
        RMQ[RabbitMQ]
        MinIO[(MinIO)]
    end

    Vue --> Traefik
    Traefik --> BFF
    BFF --> core
    BFF --> domain
    BFF --> support

    core --> PG
    domain --> PG
    support --> PG

    domain --> RMQ
    core --> RMQ
    BFF --> Redis
    domain --> Redis
    profile --> MinIO
    forum --> MinIO
```

## 🔄 Паттерны взаимодействия

| Паттерн | Когда | Пример |
|---------|-------|--------|
| **Sync HTTP** | Нужен немедленный ответ | BFF → `plan-config.limits/check` |
| **Async event** | Side effects, fan-out | `marketplace.order_completed` → deal-feedback — [messaging](./messaging.md) |
| **WS relay** | Realtime UI | auction → Redis pub/sub → BFF → client |
| **Denormalized cache** | Частое чтение агрегата | user-profile ← rating |
| **Saga (choreography)** | Мulti-step без оркестратора | activate plan: plan-config → billing.charge → plan-config.subscription |

### Синхронный flow: создание аукциона

```mermaid
sequenceDiagram
    participant C as Client
    participant B as BFF
    participant plan-config as plan-config
    participant A as auction

    C->>B: POST /api/v1/auctions
    B->>PC: POST /limits/check
    PC-->>B: allowed
    B->>A: POST /internal/v1/auctions
    A-->>B: 201 Created
    B-->>C: 201 Created
```

### Асинхронный flow: завершение аукциона

```mermaid
sequenceDiagram
    participant A as auction
    participant RMQ as RabbitMQ
    participant F as deal-feedback
    participant R as rating
    participant N as notifications

    A->>RMQ: auction.completed
    RMQ->>F: create PendingFeedback
    RMQ->>R: increment pendingSales
    RMQ->>N: trigger feedback-request
```

## 🌐 Границы доступа

| Слой | Доступность | Протокол |
|------|-------------|----------|
| BFF `/api/v1/*` | Public (JWT) | HTTPS |
| BFF `/ws/v1` | Public (JWT) | WSS |
| Services `/internal/v1/*` | Internal network only | HTTP |
| RabbitMQ | Internal only | AMQP |

## 📨 События

Полный каталог: [event-catalog.md](./event-catalog.md)  
Топология RabbitMQ (exchange, fan-out, несколько слушателей): [messaging.md](./messaging.md)

## 📋 ADR (принятые решения)

| ADR | Решение |
|-----|---------|
| [001](./adr/001-database-schema-per-service.md) | PostgreSQL schema per service |
| [002](./adr/002-bff-rest-wss.md) | REST + WebSocket на BFF |
| [003](./adr/003-settings-vs-financial-policy.md) | Два реестра переменных |
| [004](./adr/004-notifications-adapter.md) | Novu Cloud Free + adapter |
| [005](./adr/005-forum-terminology.md) | Forum: topic/comment, deprecate post |
| [006](./adr/006-service-renames-deal-feedback-subscriptions.md) | Renames: deal-feedback, subscriptions |
| [007](./adr/007-category-scoped-expert.md) | Expert scoped to category tree |
| [011](./adr/011-centralized-outbound-webhooks.md) | Исходящие webhooks |

## 📋 TODO

Актуальный backlog документации: **[DOCS-ROADMAP](../00-meta/DOCS-ROADMAP.md)** (архитектурные пункты: C4 L3, mTLS ADR, saga, admin-ui).

## 🔗 Связанные разделы

- [Микросервисы](../05-microservices/README.md)
- [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md)
- [API](../06-api/README.md)
- [Data](../10-data/README.md)
- [Deployment](../04-deployment/README.md)
- [Observability](../07-observability/README.md)
- [Security ops](../09-security/security-ops.md)
- [Moderator mapping](../09-security/moderator-mapping.md)
- [Naming](../13-maintenance/naming.md)

---

**Автор:** команда разработки · **Версия:** 0.2-draft

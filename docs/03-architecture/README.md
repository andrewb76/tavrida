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
            fp[financial-policy]
            settings
        end
        subgraph domain [Domain Services]
            auction
            forum
            rating
            feedback
            profile[user-profile]
            marketplace
            subs[auction-subscriptions]
        end
        subgraph support [Support]
            notif[notifications-adapter]
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
| **Sync HTTP** | Нужен немедленный ответ | BFF → `financial-policy.limits/check` |
| **Async event** | Side effects, fan-out | `auction.completed` → feedback, rating |
| **WS relay** | Realtime UI | auction → Redis pub/sub → BFF → client |
| **Denormalized cache** | Частое чтение агрегата | user-profile ← rating |
| **Saga (choreography)** | Мulti-step без оркестратора | activate plan: FP → billing.charge → FP.subscription |

### Синхронный flow: создание аукциона

```mermaid
sequenceDiagram
    participant C as Client
    participant B as BFF
    participant FP as financial-policy
    participant A as auction

    C->>B: POST /api/v1/auctions
    B->>FP: POST /limits/check
    FP-->>B: allowed
    B->>A: POST /internal/v1/auctions
    A-->>B: 201 Created
    B-->>C: 201 Created
```

### Асинхронный flow: завершение аукциона

```mermaid
sequenceDiagram
    participant A as auction
    participant RMQ as RabbitMQ
    participant F as feedback
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

## 📋 ADR (принятые решения)

| ADR | Решение |
|-----|---------|
| [001](./adr/001-database-schema-per-service.md) | PostgreSQL schema per service |
| [002](./adr/002-bff-rest-wss.md) | REST + WebSocket на BFF |
| [003](./adr/003-settings-vs-financial-policy.md) | Два реестра переменных |
| [004](./adr/004-notifications-adapter.md) | Novu Cloud Free + adapter |

## 📋 TODO

- [ ] C4 Level 3 — компоненты BFF и auction
- [ ] Service mesh / mTLS между internal services
- [ ] Saga: компенсация при failed charge
- [ ] admin-ui — отдельное приложение или модуль BFF

## 🔗 Связанные разделы

- [Микросервисы](../05-microservices/README.md)
- [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md)
- [API](../06-api/README.md)
- [Data](../10-data/README.md)
- [Notifications analysis](./notifications-analysis.md)

---

**Автор:** команда разработки · **Версия:** 0.2-draft

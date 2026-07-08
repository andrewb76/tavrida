# 🚀 Деплой Tavrida Lot

> **Статус:** spec ready · **Версия:** 0.2  
> **Оркестратор:** Docker Swarm · **Edge:** Traefik v3

## 🎯 Обзор

| Env | Домены | Назначение |
|-----|--------|------------|
| `local` | `*.tavrida-lot.localhost` | Разработка (pnpm + infra compose) |
| `dev` | `*.tl.dev.*` | Интеграционный стенд |
| `prod` | `*.tavrida-lot.ru` | Production |

Публичный трафик: **Traefik → BFF → internal services**. Admin/tools — `*.tools.<env>` + [tinyauth](../02-infrastructure/dev-tools.md).

## 📁 Структура репозитория (целевая)

```
docker/
├── compose/
│   ├── infra.local.yml      # PG, Redis, RabbitMQ, MinIO, Keto, Logto (dev)
│   └── tools.local.yml      # Adminer, Dozzle, Mailpit (optional)
├── swarm/
│   ├── stack-infra.yml      # Stateful + edge (Traefik)
│   ├── stack-platform.yml   # BFF + implemented services
│   └── stack-tools.yml      # Portainer, observability agents
└── images/
    └── Dockerfile.service   # Multi-stage NestJS (shared pattern)
```

> Каталог `docker/` — **TODO в коде**; этот документ фиксирует контракт до реализации.

## 🔄 CI/CD (целевой pipeline)

```mermaid
flowchart LR
    PR[PR push] --> Lint[lint + test]
    Lint --> Build[docker build matrix]
    Build --> Push[registry push :sha]
    Merge[merge master] --> DeployDev[deploy dev stack]
    Tag[tag v*] --> DeployProd[deploy prod stack]
```

| Stage | Действие |
|-------|----------|
| PR | `pnpm lint`, `pnpm test`, build affected (turbo) |
| main | Push images `:git-sha`, deploy `dev` |
| Release tag | Deploy `prod`, run migrations job |
| Rollback | Redeploy previous `:sha` — см. [runbook-rollback](./runbook-rollback.md) |

Секреты CI: Bitwarden → GitHub Actions / runner env. См. [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md).

## 🏷️ Traefik (edge)

| Router | Host | Backend |
|--------|------|---------|
| `bff-api` | `api.{env}` | BFF `:3000` |
| `bff-ws` | `api.{env}` path `/ws/v1` | BFF WS |
| `frontend` | `app.{env}` | Vue static / CDN |
| `tools-*` | `*.tools.{env}` | Admin UIs + tinyauth |

TLS: Let's Encrypt resolver (prod), mkcert / self-signed (local).

Labels pattern — см. [swarm-stacks.md](./swarm-stacks.md).

## 🗄️ Миграции БД

Schema per service ([ADR-001](../03-architecture/adr/001-database-schema-per-service.md)).  
Процесс: [migrations.md](./migrations.md).

**Правило деплоя:** migration job **до** rolling update сервиса (expand-only migrations).

## 🩺 Health checks

Все NestJS-сервисы:

| Endpoint | Swarm check | Назначение |
|----------|-------------|------------|
| `GET /health` | liveness | Процесс жив |
| `GET /health/ready` | readiness | DB + RabbitMQ (+ Redis если нужен) |

BFF ready: upstream ping optional (fail open с degraded flag) — **TBD при реализации**.

Traefik: только route на сервисы с `ready=200`.

## 📦 Версионирование образов

```
registry.example.com/tavrida/billing:{git-sha}
registry.example.com/tavrida/billing:{semver}  # release tags only
```

Не использовать `:latest` в prod.

## 🔗 Runbooks

| Документ | Содержание |
|----------|------------|
| [swarm-stacks.md](./swarm-stacks.md) | Стеки, сети, labels |
| [migrations.md](./migrations.md) | TypeORM migrations job |
| [runbook-rollback.md](./runbook-rollback.md) | Откат релиза |
| [local-dev.md](./local-dev.md) | Локальный запуск |

## 🔗 Связанные разделы

- [Инфраструктура](../02-infrastructure/README.md)
- [Observability](../07-observability/README.md)
- [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md)
- [Процесс разработки](../12-dev-process/README.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

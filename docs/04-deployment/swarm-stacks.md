# 🐳 Docker Swarm — стеки и сети

> **Статус:** spec ready · **Версия:** 0.2

## 🎯 Принципы

1. **Три stack-файла** — infra, platform, tools (независимый lifecycle).
2. **Overlay network** `tavrida_net` — все сервисы платформы.
3. **Secrets** — Swarm secrets из Bitwarden, не env-файлы в prod.
4. **Публичный доступ** — только Traefik-published ports (443/80).

## 📦 stack-infra

| Service | Replicas | Volumes | Notes |
|---------|----------|---------|-------|
| traefik | 1+ (manager) | — | Entrypoint, TLS |
| postgres | 1 | `pg_data` | `tavrida_lot` DB |
| redis | 1 | optional | AOF off for cache |
| rabbitmq | 1 | `rmq_data` | management plugin internal |
| minio | 1 | `minio_data` | Console via tools stack |
| keto | 1 | — | read/write APIs internal |
| logto | 1 | `logto_data` | OIDC |

## 📦 stack-platform

| Service | Port (internal) | Published |
|---------|-----------------|-----------|
| bff | 3000 | via Traefik |
| billing | 3001 | no |
| plan-config | 3002 | no |
| auction | 3003 | no |
| subscriptions | 3004 | no |
| … domain services | 3005+ | no |

**Deploy config (пример):**

```yaml
services:
  billing:
    image: registry/tavrida/billing:${GIT_SHA}
    networks: [tavrida_net]
    secrets:
      - database_url
      - rabbitmq_url
    environment:
      NODE_ENV: production
      PORT: "3001"
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 30s
        order: start-first
      rollback_config:
        parallelism: 1
      restart_policy:
        condition: on-failure
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health/ready"]
      interval: 30s
      timeout: 5s
      retries: 3
```

## 📦 stack-tools

Portainer, Dozzle, Adminer, RedisInsight, Mailpit — см. [dev-tools](../02-infrastructure/dev-tools.md).  
Все роутеры: middleware `tinyauth`.

## 🏷️ Traefik labels (BFF)

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.bff.rule=Host(`api.tavrida-lot.ru`)
  - traefik.http.routers.bff.entrypoints=websecure
  - traefik.http.routers.bff.tls.certresolver=letsencrypt
  - traefik.http.services.bff.loadbalancer.server.port=3000
  # WebSocket — same router, no strip prefix
  - traefik.http.routers.bff-ws.rule=Host(`api.tavrida-lot.ru`) && PathPrefix(`/ws/v1`)
```

## 🌐 DNS (prod)

| Record | Target |
|--------|--------|
| `app.tavrida-lot.ru` | Traefik |
| `api.tavrida-lot.ru` | Traefik |
| `*.tools.tavrida-lot.ru` | Traefik (tools stack) |

## 🔐 Secrets mapping

| Swarm secret | Env in container |
|--------------|------------------|
| `tavrida_database_url` | `DATABASE_URL` |
| `tavrida_rabbitmq_url` | `RABBITMQ_URL` |
| `tavrida_novu_api_key` | `NOVU_API_KEY` |
| `tavrida_sentry_dsn` | `SENTRY_DSN` |

Полный список: [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md).

## 🔗 Связанные разделы

- [04-deployment/README.md](./README.md)
- [runbook-rollback.md](./runbook-rollback.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

# 📈 Grafana Cloud

> **Статус:** in progress · **Версия:** 0.5  
> **Среда:** dev Swarm (`evatorg.su`) → Grafana Cloud Free (SaaS)

## 🎯 Стек observability

| Сигнал | Backend | Agent на Swarm |
|--------|---------|----------------|
| Metrics | Grafana Mimir (Cloud) | Alloy `prometheus.exporter.cadvisor` → remote_write |
| Logs | Grafana Loki | Alloy `loki.source.docker` (stdout контейнеров) |
| Traces | Grafana Tempo | **отложено** — пустой `GRAFANA_CLOUD_OTLP_ENDPOINT` валил весь Alloy; вернём OTLP в config после стабильных Cloud vars + Nest OTel |
| Errors | Hawk.so | отдельно, см. [hawk-setup.md](./hawk-setup.md) |

NestJS OTel SDK (`@tavrida/otel`) — **ещё не подключён**. Labels: `env=dev`, `cluster=tavrida-dev`.

## 🚀 Bootstrap (dev) — чеклист

### 1. Stack в Grafana Cloud (вы)

1. Зайти на [grafana.com](https://grafana.com/) → создать / выбрать **Free** stack (регион ближе к VPS, напр. EU).
2. **Access Policy** (Administration → Users and access → Cloud access policies):
   - Name: `tavrida-dev-alloy`
   - Realms: ваш stack
   - Scopes: `metrics:write`, `logs:write`, `traces:write`
   - Создать **token** → сохранить (один раз).
3. Скопировать endpoints (Connections / My Account → stack details):

| Поле | Откуда в UI | Куда кладём |
|------|-------------|-------------|
| Prometheus remote write URL | Prometheus → Details | `GRAFANA_CLOUD_PROMETHEUS_URL` |
| Prometheus Username (instance id) | то же | `GRAFANA_CLOUD_PROMETHEUS_USERNAME` |
| Loki push URL | Loki → Details | `GRAFANA_CLOUD_LOKI_URL` |
| Loki Username | то же | `GRAFANA_CLOUD_LOKI_USERNAME` |
| OTLP gateway URL | OpenTelemetry / Tempo | `GRAFANA_CLOUD_OTLP_ENDPOINT` (обычно `…/otlp`) |
| OTLP Instance ID | то же (часто = Prometheus username) | `GRAFANA_CLOUD_OTLP_INSTANCE_ID` |
| Access Policy token | шаг 2 | `GRAFANA_CLOUD_TOKEN` (**secret**) |

### 2. GitHub Environment `dev`

**Variables:**

```
GRAFANA_CLOUD_PROMETHEUS_URL=https://prometheus-prod-XX-….grafana.net/api/prom/push
GRAFANA_CLOUD_PROMETHEUS_USERNAME=<prometheus instance id>
GRAFANA_CLOUD_LOKI_URL=https://logs-prod-XX.grafana.net/loki/api/v1/push
GRAFANA_CLOUD_LOKI_USERNAME=<loki instance id>
GRAFANA_CLOUD_OTLP_ENDPOINT=https://otlp-gateway-prod-XX.grafana.net/otlp
GRAFANA_CLOUD_OTLP_INSTANCE_ID=<instance id>
```

**Secret:** `GRAFANA_CLOUD_TOKEN=<access policy token>`

Локально (ноутбук): те же ключи в `docker/swarm/dev.env` + `GRAFANA_CLOUD_TOKEN` в `dev.secrets.env`.

### 3. Sync + deploy

```bash
# с ноутбука
DOCKER_CONTEXT=dev-swarm ./docker/swarm/sync-secrets-dev.sh   # создаст tavrida_dev_grafana_cloud_token
DOCKER_CONTEXT=dev-swarm ./docker/swarm/deploy-dev.sh         # подтянет stack-tools, если PROMETHEUS_URL задан
```

Или Actions → **Sync secrets (dev)**: `force=true`, **`only=GRAFANA_CLOUD_TOKEN`**, `redeploy=true`.  
Не используйте force по всему manifest — упрётесь в rebind `keto-schema-init` / ротацию `POSTGRES_PASSWORD`.

Пустой `GRAFANA_CLOUD_PROMETHEUS_URL` → Alloy **не** деплоится (остальной stack без изменений).  
Если URL задан — `deploy-dev.sh` требует Prometheus + Loki Cloud vars (OTLP для traces пока не обязателен — см. config без otelcol).

`docker stack deploy` использует `--resolve-image changed` (не `always`): иначе менеджер на VPS снова ходит в GHCR/Docker Hub и деплой флапает на TLS/timeout.

### 4. Проверка

```bash
DOCKER_CONTEXT=dev-swarm docker service ps tavrida-dev_alloy
DOCKER_CONTEXT=dev-swarm docker service logs --tail 80 tavrida-dev_alloy

# Env реально попал в задачу (после смены GH vars нужен redeploy):
DOCKER_CONTEXT=dev-swarm docker service inspect tavrida-dev_alloy \
  --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' | grep GRAFANA
```

Если в логах `at least one endpoint must be specified` / caret на `otelcol.exporter.otlphttp` —  
`GRAFANA_CLOUD_OTLP_ENDPOINT` **пустой в контейнере** (var не в Environment `dev`, или не было redeploy после добавления). URL вида `…/otlp` верный; проблема не в формате.

В Grafana Cloud Explore:

- **Loki:** `{env="dev"}` или `{swarm_service="tavrida-dev_bff"}`
- **Prometheus:** `container_memory_usage_bytes{env="dev"}`
- **Tempo:** после OTel в сервисах — поиск по `service.name`

Опционально: Connections → **Docker** integration → Install dashboards.

## 📦 Файлы в репо

| Путь | Назначение |
|------|------------|
| `docker/config/alloy/config.alloy` | River-конфиг Alloy |
| `docker/swarm/stack-tools.dev.yml` | сервис `alloy` (cAdvisor + Docker logs + OTLP) |
| `docker/swarm/deploy-dev.sh` | добавляет tools compose, если URL задан |
| `docker/swarm/secrets-manifest.dev` | `GRAFANA_CLOUD_TOKEN` → `tavrida_dev_grafana_cloud_token` |

При правке `config.alloy` bump Swarm config: `alloy_config_v2` → `v3` в `stack-tools.dev.yml` (configs immutable).

## 📊 Базовые дашборды (цель)

| Dashboard | Панели |
|-----------|--------|
| **Platform overview** | RPS per service, p95 latency, 5xx rate |
| **BFF** | WS connections, rate limit hits, upstream errors |
| **Auction live** | `auction.bid_placed` rate, Redis pub/sub lag |
| **Billing** | charge success/fail, 402 count |
| **RabbitMQ** | queue depth, consumer lag, DLQ size |
| **PostgreSQL** | connections per schema, slow queries |

На этапе Alloy: контейнерные метрики + логи. App-метрики `tavrida_lot_*` — после OTel SDK.

## 🔔 Алерты (минимум prod)

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighErrorRate | 5xx > 1% for 5m | critical |
| BFFLatency | p95 > 2s for 10m | warning |
| RabbitMQBacklog | queue > 1000 for 15m | warning |
| DiskPostgres | volume > 85% | warning |
| ServiceDown | `/health/ready` fail 3× | critical |

Notification channel: Telegram/email — contact points в Grafana Cloud (вне repo).

## 🏷️ Labels (обязательные)

```
service=<name>          # app metrics / OTel
env=prod|dev|local
deployment_version=<git-sha>
cluster=tavrida-dev     # Swarm cluster id (Alloy)
```

## 🔗 Связанные разделы

- [logging-metrics.md](./logging-metrics.md)
- [slo.md](./slo.md)
- [hawk-setup.md](./hawk-setup.md)
- [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md)
- [github-actions.md](../04-deployment/github-actions.md)
- [README.dev.md](../../docker/swarm/README.dev.md)

---

**Автор:** команда разработки · **Версия:** 0.3

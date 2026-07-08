# 📈 Grafana Cloud

> **Статус:** spec ready · **Версия:** 0.2

## 🎯 Стек observability

| Сигнал | Backend | Agent |
|--------|---------|-------|
| Metrics | Grafana Mimir (Cloud) | Alloy / OTel Prometheus exporter |
| Logs | Grafana Loki | Alloy → JSON stdout |
| Traces | Grafana Tempo | OpenTelemetry SDK → OTLP |
| Errors | Sentry | `@sentry/node`, `@sentry/vue` |

Env: `OTEL_EXPORTER_OTLP_ENDPOINT` — см. [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md).

## 🚀 Bootstrap

1. Создать stack в [Grafana Cloud](https://grafana.com/) (free tier для dev).
2. Получить endpoints: Prometheus remote write, Loki push, Tempo OTLP.
3. Deploy **Grafana Alloy** как sidecar или stack-tools service.
4. NestJS: `@opentelemetry/sdk-node` + auto-instrumentation HTTP/pg/amqp.

## 📊 Базовые дашборды

| Dashboard | Панели |
|-----------|--------|
| **Platform overview** | RPS per service, p95 latency, 5xx rate |
| **BFF** | WS connections, rate limit hits, upstream errors |
| **Auction live** | `auction.bid_placed` rate, Redis pub/sub lag |
| **Billing** | charge success/fail, 402 count |
| **RabbitMQ** | queue depth, consumer lag, DLQ size |
| **PostgreSQL** | connections per schema, slow queries |

## 🔔 Алерты (минимум prod)

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighErrorRate | 5xx > 1% for 5m | critical |
| BFFLatency | p95 > 2s for 10m | warning |
| RabbitMQBacklog | queue > 1000 for 15m | warning |
| DiskPostgres | volume > 85% | warning |
| ServiceDown | `/health/ready` fail 3× | critical |

Notification channel: Telegram/email — вне repo (Grafana contact points).

## 🏷️ Labels (обязательные)

```
service=billing
env=prod|dev|local
deployment_version=<git-sha>
```

## 🔗 Связанные разделы

- [logging-metrics.md](./logging-metrics.md)
- [slo.md](./slo.md)
- [sentry-setup.md](./sentry-setup.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

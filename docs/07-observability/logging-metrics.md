# 📝 Логи, метрики, трейсинг

> **Статус:** spec ready · **Версия:** 0.2

## 🎯 Принципы

1. **Structured JSON** logs в stdout (12-factor).
2. **correlationId** — из заголовка `X-Request-Id`; прокидывать в RMQ envelope.
3. **OpenTelemetry** — traces + metrics; Sentry — errors + optional performance.
4. **No PII** в logs (email, full JWT); `userId` — OK.

## 📄 Формат лога (NestJS)

```json
{
  "level": "info",
  "time": "2026-07-08T18:00:00.000Z",
  "service": "billing",
  "correlationId": "req-uuid",
  "msg": "charge completed",
  "userId": "uuid",
  "transactionId": "uuid",
  "durationMs": 42
}
```

Рекомендуется: `pino` + `pino-http`.

## 🏷️ Именование метрик

Prefix: `tavrida_lot_` (Prometheus).

| Metric | Type | Labels |
|--------|------|--------|
| `tavrida_lot_http_requests_total` | counter | `service`, `method`, `route`, `status` |
| `tavrida_lot_http_request_duration_seconds` | histogram | `service`, `route` |
| `tavrida_lot_rmq_messages_total` | counter | `service`, `event_type`, `direction` |
| `tavrida_lot_db_query_duration_seconds` | histogram | `service`, `operation` |
| `tavrida_lot_ws_relay_lag_seconds` | histogram | `channel_type` |

## 🔭 OpenTelemetry

```ts
// bootstrap (main.ts) — sketch
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
  }),
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'billing',
})
sdk.start()
```

Span names: `HTTP POST /internal/v1/wallets/charge`, `RMQ consume auction.completed`.

## 🐛 Sentry

Release: `tavrida-lot@${GIT_SHA}`.  
См. [sentry-setup.md](./sentry-setup.md).

## 🔗 Связанные разделы

- [grafana-setup.md](./grafana-setup.md)
- [06-api — correlationId](../06-api/README.md)
- [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

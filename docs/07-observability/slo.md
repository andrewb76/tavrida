# 📐 SLI / SLO

> **Статус:** spec ready · **Версия:** 0.2

## 🎯 Scope

SLO для **user-facing** пути через BFF. Internal-only сервисы — best-effort с алертами.

## 📊 Service Level Indicators

| SLI | Измерение | PromQL / источник (concept) |
|-----|-----------|----------------------------|
| **Availability** | % успешных запросов (non-5xx) | `sum(rate(http_requests_total{status!~"5.."}[5m])) / sum(rate(http_requests_total[5m]))` |
| **Latency** | p95 HTTP duration | histogram `http_request_duration_seconds` |
| **Bid delivery** | WS `bid.placed` within 500ms of RMQ | custom metric `tavrida_lot_ws_relay_lag_seconds` |
| **Charge success** | % `billing.charge_completed` vs attempts | event counter |

## 🎯 SLO targets (prod, draft)

| Path | Availability | Latency p95 | Error budget (30d) |
|------|--------------|-------------|-------------------|
| `GET /api/v1/auctions` | 99.5% | 800 ms | 0.5% |
| `POST …/bids` | 99.9% | 500 ms | 0.1% |
| `GET /api/v1/wallets/balance` | 99.9% | 300 ms | 0.1% |
| WebSocket connect | 99.5% | 2 s handshake | 0.5% |
| Platform aggregate | 99.5% | — | 0.5% |

Error budget policy: при исчерпании 50% — freeze non-critical deploys, focus reliability.

## 🚫 Not in SLO (explicit)

- Admin tools (`*.tools.*`)
- Novu email delivery (vendor SLA)
- Logto availability (dependency — monitor separately)

## 📋 Review

- Ежеквартальный пересмотр SLO
- После MVP — уточнить по реальным Grafana данным

## 🔗 Связанные разделы

- [grafana-setup.md](./grafana-setup.md)
- [runbook-rollback](../04-deployment/runbook-rollback.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec

# 📊 Observability

> **Статус:** in progress · **Версия:** 0.3

## 🎯 Назначение

Мониторинг, логирование, трейсинг и алертинг Tavrida Lot.

## 📦 Стек

| Инструмент | Назначение |
|------------|------------|
| Grafana Cloud | Метрики (Mimir), логи (Loki), трейсы (Tempo) |
| Grafana Alloy | Agent на Swarm → Cloud ([grafana-setup](./grafana-setup.md)) |
| OpenTelemetry | SDK в NestJS (planned) → Alloy OTLP |
| Sentry | Ошибки frontend + backend |
| Dozzle / Jaeger | Local debug ([dev-tools](../02-infrastructure/dev-tools.md)) |

## 📄 Документы

| Документ | Описание |
|----------|----------|
| [logging-metrics.md](./logging-metrics.md) | JSON logs, metric names, OTel |
| [grafana-setup.md](./grafana-setup.md) | Cloud stack, Alloy на dev, dashboards, alerts |
| [slo.md](./slo.md) | SLI/SLO targets |
| [sentry-setup.md](./sentry-setup.md) | Sentry NestJS + Vue |

## 📋 Implementation TODO

- [x] Sentry SDK Nest + Vue → Hawk DSN ([sentry-setup](./sentry-setup.md))
- [x] Alloy agent в `stack-tools.dev.yml` → Grafana Cloud (dev) — **отложено включать**
- [ ] OTel bootstrap shared package `@tavrida/otel`
- [ ] Grafana dashboards as code (optional)
- [ ] SLO recording rules в Mimir
- [ ] Point NestJS `OTEL_EXPORTER_OTLP_ENDPOINT=http://alloy:4318` на Swarm

## 🔗 Связанные разделы

- [Деплой](../04-deployment/README.md)
- [Тестирование](../08-testing/README.md)
- [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md)

---

**Автор:** команда разработки · **Версия:** 0.3
